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

async function fetchLiveUserFromService(user) {
  if (!user?.id) return user;

  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
  const response = await fetch(`${userServiceUrl}/users/profile/me`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-user': JSON.stringify(user),
    },
    signal: AbortSignal.timeout(8_000),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message ?? 'Unable to refresh user profile.');
    error.statusCode = response.status;
    throw error;
  }

  return body?.data ?? body;
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
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': process.env.INTERNAL_SECRET || '',
          },
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
      try {
        await fastify.redis.set(`blacklist:${token}`, '1', 'EX', ttl);
        fastify.log.info({ userId: decoded?.id, ttl }, '[auth/logout] token blacklisted');
      } catch {
        fastify.log.warn('[auth/logout] Redis unavailable, token not blacklisted');
      }
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
      try {
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
      } catch {
        // Redis unavailable — skip blacklist check in dev
        fastify.log.warn('[auth/me] Redis unavailable, skipping blacklist check');
      }
    }

    try {
      request.user = await fetchLiveUserFromService(request.user);
    } catch (err) {
      fastify.log.error({ err: err.message, userId: request.user?.id }, '[auth/me] failed to refresh user');
      return reply.code(503).send({
        statusCode: 503,
        intOpCode:  'SxGW503',
        data:       null,
        error:      'Service Unavailable',
        message:    'Unable to refresh your latest profile right now. Please try again shortly.',
      });
    }

    return reply.code(200).send({
      statusCode: 200,
      intOpCode:  'SxGW200',
      data:       { user: request.user },
    });
  });
}
