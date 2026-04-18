import fp from 'fastify-plugin';
import Redis from 'ioredis';

/**
 * Redis — decorates fastify with a shared ioredis client.
 *
 *   fastify.redis       — ioredis instance (same reference as fastify.redisClient)
 *   fastify.redisClient — alias consumed by @fastify/rate-limit
 *
 * Uses lazyConnect so that a missing Redis server never blocks startup.
 * The first actual command (rate-limit incr, blacklist set/get…) triggers
 * the connection automatically. While Redis is down, rate-limit falls back
 * to in-memory (skipOnError: true) and blacklist checks are no-ops.
 */
async function redisPlugin(fastify) {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    // lazyConnect = true: do NOT connect at construction time.
    // The first command (or the explicit connect() below) triggers the attempt.
    lazyConnect: true,
    // Queue commands issued before the connection is established so they
    // execute automatically once Redis becomes available.
    enableOfflineQueue: true,
    // Back-off retry: 300 ms, 600 ms … up to 3 s cap, max 10 retries then stop.
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 300, 3_000);
    },
  });

  client.on('error', (err) => {
    fastify.log.error({ err }, '[redis] connection error');
  });

  client.on('connect',    () => fastify.log.info('[redis] connected'));
  client.on('ready',      () => fastify.log.info('[redis] ready'));
  client.on('reconnecting', () => fastify.log.warn('[redis] reconnecting…'));
  client.on('end',        () => fastify.log.warn('[redis] connection closed'));

  // Expose on fastify so other plugins/routes can use fastify.redis
  fastify.decorate('redis',       client);
  fastify.decorate('redisClient', client);  // alias for @fastify/rate-limit

  // Kick off the connection in the background — never awaited, never throws.
  client.connect().catch(() => { /* handled by the 'error' event above */ });

  // Graceful disconnect when Fastify closes
  fastify.addHook('onClose', async () => {
    try { await client.quit(); } catch { /* ignore */ }
  });
}

export default fp(redisPlugin, { name: 'redis' });
