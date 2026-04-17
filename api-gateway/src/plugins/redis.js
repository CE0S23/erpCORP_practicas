import fp from 'fastify-plugin';
import Redis from 'ioredis';

/**
 * Redis — decorates fastify with a shared ioredis client when REDIS_URL is set.
 *
 *   fastify.redisClient — ioredis instance consumed by @fastify/rate-limit, or
 *                         null when REDIS_URL is not defined (in-memory fallback).
 *
 * Uses lazyConnect so a missing server never blocks startup.
 * While Redis is down, rate-limit falls back to in-memory (skipOnError: true).
 */
async function redisPlugin(fastify) {
  if (!process.env.REDIS_URL) {
    fastify.log.info('[redis] REDIS_URL not set — skipping Redis, rate-limit will use in-memory store');
    fastify.decorate('redisClient', null);
    return;
  }

  const client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: true,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 300, 3_000);
    },
  });

  client.on('error',        (err) => fastify.log.error({ err }, '[redis] connection error'));
  client.on('connect',      ()    => fastify.log.info('[redis] connected'));
  client.on('ready',        ()    => fastify.log.info('[redis] ready'));
  client.on('reconnecting', ()    => fastify.log.warn('[redis] reconnecting…'));
  client.on('end',          ()    => fastify.log.warn('[redis] connection closed'));

  fastify.decorate('redisClient', client);

  client.connect().catch(() => { /* handled by the 'error' event above */ });

  fastify.addHook('onClose', async () => {
    try { await client.quit(); } catch { /* ignore */ }
  });
}

export default fp(redisPlugin, { name: 'redis' });
