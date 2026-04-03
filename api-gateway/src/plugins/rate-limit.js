import fp from 'fastify-plugin';
import fastifyRateLimit from '@fastify/rate-limit';

/**
 * Rate limit — global 100 req/min stored in Redis.
 * Individual routes can override via:  config: { rateLimit: { max, timeWindow } }
 *
 * Depends on: redis plugin (fastify.redisClient must be decorated first).
 */
async function rateLimitPlugin(fastify) {
  await fastify.register(fastifyRateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis: fastify.redisClient,
    // Key generator: per IP by default
    keyGenerator(request) {
      return request.ip;
    },
    errorResponseBuilder(request, context) {
      return {
        statusCode: 429,
        intOpCode:  'SxGW429',
        data:       null,
        error:      'Too Many Requests',
        message:    `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        retryAfter: Math.ceil(context.ttl / 1000),
      };
    },
    // Fail open if Redis is unavailable: don't block requests
    allowList: [],
    skipOnError: true,
  });
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  dependencies: ['redis'],
});
