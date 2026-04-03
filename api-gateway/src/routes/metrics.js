/**
 * Metrics route  (/api/metrics)
 *
 * GET /api/metrics — returns all collected metrics from the user-service DB.
 * Requires valid JWT (not blacklisted).
 * Wrapped in the universal { statusCode, intOpCode, data } schema.
 */

function extractToken(request) {
  const auth = request.headers.authorization ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export default async function metricsRoutes(fastify) {
  fastify.get('/metrics', async (request, reply) => {
    // ── JWT verification ──────────────────────────────────────────────────
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

    // ── Blacklist check ───────────────────────────────────────────────────
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

    // ── Fetch metrics from user-service ───────────────────────────────────
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    const internalSecret = process.env.INTERNAL_SECRET || '';

    let metricsResponse;
    try {
      metricsResponse = await fetch(`${userServiceUrl}/internal/metrics`, {
        method:  'GET',
        headers: {
          'Accept':            'application/json',
          'X-Internal-Secret': internalSecret,
        },
        signal: AbortSignal.timeout(8_000),
      });
    } catch (err) {
      fastify.log.error({ err: err.message }, '[metrics] user-service unreachable');
      return reply.code(503).send({
        statusCode: 503,
        intOpCode:  'SxGW503',
        data:       null,
        error:      'Service Unavailable',
        message:    'Metrics service is currently unavailable.',
      });
    }

    const body = await metricsResponse.json().catch(() => ({}));

    // user-service wraps in { statusCode, intOpCode, data }
    const metrics = body.data ?? body;

    return reply.code(200).send({
      statusCode: 200,
      intOpCode:  'SxGW200',
      serviceCode: body.intOpCode ?? null,
      data:       metrics,
    });
  });
}
