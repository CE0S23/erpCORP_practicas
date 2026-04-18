// groups-service/src/server.js
// ─── Entry point ─────────────────────────────────────────────────────────────

import 'dotenv/config';
import Fastify from 'fastify';

// ─── Plugins ──────────────────────────────────────────────────────────────────
import prismaPlugin from './plugins/prisma.js';
import xUserPlugin  from './plugins/x-user.js';

// ─── Routes ───────────────────────────────────────────────────────────────────
import categoryRoutes from './routes/categories.js';
import groupRoutes    from './routes/groups.js';
import memberRoutes   from './routes/members.js';

// ─── Logger ───────────────────────────────────────────────────────────────────
const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';

const logger = isDev
  ? {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize:      true,
          translateTime: 'HH:MM:ss Z',
          ignore:        'pid,hostname',
          singleLine:    false,
        },
      },
      level: 'debug',
    }
  : { level: 'info' };

// ─── Fastify instance ─────────────────────────────────────────────────────────
const fastify = Fastify({
  logger,
  genReqId(req) {
    return req.headers['x-request-id'] ?? crypto.randomUUID();
  },
  trustProxy: true,
  ajv: {
    customOptions: {
      formats: {
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      },
    },
  },
});

// ─── Plugin registration (order matters) ─────────────────────────────────────
await fastify.register(prismaPlugin);
await fastify.register(xUserPlugin);

// ─── Route registration ───────────────────────────────────────────────────────
await fastify.register(categoryRoutes);
await fastify.register(groupRoutes);
await fastify.register(memberRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
fastify.get('/health', async () => ({
  status:    'ok',
  service:   'groups-service',
  timestamp: new Date().toISOString(),
  uptime:    process.uptime(),
  env:       process.env.NODE_ENV ?? 'development',
}));

// ─── Universal JSON response schema (SxGR) ───────────────────────────────────

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error({ err: error, url: request.url }, 'Unhandled error');
  const statusCode = error.statusCode ?? 500;
  return reply.code(statusCode).send({
    statusCode,
    intOpCode: `SxGR${statusCode}`,
    data:    null,
    error:   error.name ?? 'Internal Server Error',
    message: statusCode < 500 ? error.message : 'An unexpected error occurred.',
  });
});

fastify.setNotFoundHandler((request, reply) => {
  return reply.code(404).send({
    statusCode: 404,
    intOpCode:  'SxGR404',
    data:       null,
    error:      'Not Found',
    message:    `Route ${request.method} ${request.url} not found.`,
  });
});

// Wrap every response in the universal schema
fastify.addHook('onSend', (_request, reply, payload, done) => {
  // Skip no-content or null payloads
  if (reply.statusCode === 204 || payload == null) return done(null, payload);

  let parsed;
  try {
    parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch {
    return done(null, payload); // non-JSON, leave as-is
  }

  // Already wrapped (from error handler or 404 handler)
  if (parsed?.intOpCode) return done(null, typeof payload === 'string' ? payload : JSON.stringify(parsed));

  const statusCode = reply.statusCode;
  const intOpCode  = `SxGR${statusCode}`;

  const wrapped = statusCode >= 400
    ? { statusCode, intOpCode, data: null, error: parsed.error ?? 'Error', message: parsed.message ?? 'An error occurred.' }
    : { statusCode, intOpCode, data: parsed };

  reply.header('content-type', 'application/json; charset=utf-8');
  done(null, JSON.stringify(wrapped));
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  fastify.log.info(`[server] received ${signal}, shutting down…`);
  try {
    await fastify.close();
    fastify.log.info('[server] closed cleanly');
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, '[server] error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─── Start ────────────────────────────────────────────────────────────────────
const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = parseInt(process.env.PORT ?? '3002', 10);

try {
  await fastify.listen({ host: HOST, port: PORT });
  fastify.log.info(`[server] Groups Service listening on http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error({ err }, '[server] failed to start');
  process.exit(1);
}
