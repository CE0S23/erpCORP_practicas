/**
 * Auth routes  (/auth)
 *
 * POST /auth/login   — delegates credential check to USER_SERVICE,
 *                      returns a signed JWT on success.
 * POST /auth/logout  — blacklists the current token in Redis until it expires.
 * GET  /auth/me      — returns the decoded JWT payload (requires valid token).
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the raw Bearer token from the Authorization header.
 * Returns null if the header is absent or malformed.
 */
function extractToken(request) {
  const auth = request.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * Returns the remaining TTL in seconds for a JWT (exp - now).
 * Returns 0 if already expired or if exp is missing.
 */
function tokenTtl(decoded) {
  if (!decoded?.exp) return 0;
  const remaining = decoded.exp - Math.floor(Date.now() / 1000);
  return remaining > 0 ? remaining : 0;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function authRoutes(fastify) {
  // ── POST /auth/login ────────────────────────────────────────────────────────
  fastify.post('/login', {
    // Stricter rate limit: 10 req/min per IP (overrides the global 100 req/min)
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
        errorResponseBuilder(_req, ctx) {
          return {
            statusCode: 429,
            intOpCode:  'SxGW429',
            data:       null,
            error:      'Too Many Requests',
            message:    `Too many login attempts. Try again in ${Math.ceil(ctx.ttl / 1000)} seconds.`,
            retryAfter: Math.ceil(ctx.ttl / 1000),
          };
        },
      },
    },
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            statusCode:  { type: 'integer' },
            intOpCode:   { type: 'string' },
            serviceCode: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                user:  { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    const userServiceUrl =
      process.env.USER_SERVICE_URL || 'http://localhost:3001';

    // ── Delegate credential verification to the user microservice ────────────
    let serviceResponse;
    try {
      serviceResponse = await fetch(
        `${userServiceUrl}/internal/verify-credentials`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(8_000),
        }
      );
    } catch (err) {
      fastify.log.error({ err }, '[auth/login] user-service unreachable');
      return reply.code(503).send({
        statusCode: 503,
        intOpCode:  'SxGW503',
        data:       null,
        error:      'Service Unavailable',
        message:    'Authentication service is currently unavailable. Please try again later.',
      });
    }

    const serviceBody = await serviceResponse.json().catch(() => ({}));
    const serviceCode = serviceBody.intOpCode ?? null;

    if (!serviceResponse.ok) {
      const status = serviceResponse.status;
      return reply.code(status).send({
        statusCode:  status,
        intOpCode:   `SxGW${status}`,
        ...(serviceCode && { serviceCode }),
        data:        null,
        error:       serviceBody.error   ?? 'Error',
        message:     serviceBody.message ?? 'Authentication failed.',
      });
    }

    // The user-service now wraps in { statusCode, intOpCode, data: { user } }
    const userData = serviceBody.data ?? serviceBody;
    const user     = userData.user ?? userData;

    // ── Build JWT payload ─────────────────────────────────────────────────────
    const payload = {
      id:          user.id,
      email:       user.email,
      name:        user.name,
      role:        user.role,
      permissions: user.permissions ?? [],
    };

    const token = fastify.jwt.sign(payload);

    fastify.log.info({ userId: user.id, role: user.role }, '[auth/login] token issued');

    return reply.code(200).send({
      statusCode:  200,
      intOpCode:   'SxGW200',
      ...(serviceCode && { serviceCode }),
      data:        { token, user: payload },
    });
  });

  // ── POST /auth/logout ───────────────────────────────────────────────────────
  fastify.post('/logout', async (request, reply) => {
    // Verify the token first (throws if invalid / expired)
    try {
      await request.jwtVerify();
    } catch {
      // Even for invalid tokens we respond 200 — idempotent logout
      return reply.code(200).send({
        statusCode: 200,
        intOpCode:  'SxGW200',
        data:       { message: 'Logged out.' },
      });
    }

    const token = extractToken(request);
    if (!token) {
      return reply.code(200).send({
        statusCode: 200,
        intOpCode:  'SxGW200',
        data:       { message: 'Logged out.' },
      });
    }

    // Decode to read expiration without re-verifying (already done above)
    const decoded = fastify.jwt.decode(token);
    const ttl     = tokenTtl(decoded);

    if (ttl > 0) {
      // Blacklist the token until it would have naturally expired
      await fastify.redis.set(`blacklist:${token}`, '1', 'EX', ttl);
      fastify.log.info(
        { userId: decoded?.id, ttl },
        '[auth/logout] token blacklisted'
      );
    }

    return reply.code(200).send({
      statusCode: 200,
      intOpCode:  'SxGW200',
      data:       { message: 'Logged out successfully.' },
    });
  });

  // ── GET /auth/me ─────────────────────────────────────────────────────────────
  fastify.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({
        statusCode: 401,
        intOpCode:  'SxGW401',
        data:       null,
        error:      'Unauthorized',
        message:    err.message,
      });
    }

    // Also check blacklist so a logged-out token cannot call /me
    const token = extractToken(request);
    if (token) {
      const blacklisted = await fastify.redis.get(`blacklist:${token}`);
      if (blacklisted) {
        return reply.code(401).send({
          statusCode: 401,
          intOpCode:  'SxGW401',
          data:       null,
          error:      'Unauthorized',
          message:    'Token has been revoked. Please log in again.',
        });
      }
    }

    return reply.code(200).send({
      statusCode: 200,
      intOpCode:  'SxGW200',
      data:       { user: request.user },
    });
  });
}
