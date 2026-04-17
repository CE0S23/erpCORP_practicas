import fp from 'fastify-plugin';
import fastifyRateLimit from '@fastify/rate-limit';

/**
 * Rate limit — global 100 req/min per IP.
 *
 * Store selection (decided at startup):
 *   - REDIS_URL set   → uses fastify.redisClient (ioredis) as distributed store
 *   - REDIS_URL unset → uses @fastify/rate-limit's default in-memory store
 *
 * Individual routes can override via: config: { rateLimit: { max, timeWindow } }
 */
async function rateLimitPlugin(fastify) {
  const useRedis = !!process.env.REDIS_URL;

  fastify.log.info(`[rate-limit] store: ${useRedis ? 'Redis' : 'in-memory'}`);

  await fastify.register(fastifyRateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    ...(useRedis ? { redis: fastify.redisClient } : {}),
    keyGenerator(request) {
      return request.ip;
    },
    errorResponseBuilder(_request, context) {
      return {
        statusCode: 429,
        intOpCode:  'SxGW429',
        data:       null,
        error:      'Too Many Requests',
        message:    `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        retryAfter: Math.ceil(context.ttl / 1000),
      };
    },
    skipOnError: true,
  });
}

export default fp(rateLimitPlugin, {
  name:         'rate-limit',
  dependencies: ['redis'],
});
