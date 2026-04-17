// tickets-service/src/server.js
// ─── Entry point ─────────────────────────────────────────────────────────────

import 'dotenv/config';
import Fastify from 'fastify';

// ─── Plugins ──────────────────────────────────────────────────────────────────
import prismaPlugin from './plugins/prisma.js';
import xUserPlugin  from './plugins/x-user.js';

// ─── Routes ───────────────────────────────────────────────────────────────────
import ticketRoutes  from './routes/tickets.js';
import commentRoutes from './routes/comments.js';

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
  : true;

// ─── Fastify instance ─────────────────────────────────────────────────────────
const fastify = Fastify({
  logger,
  genReqId(req) {
    return req.headers['x-request-id'] ?? crypto.randomUUID();
  },
  // Trust the API Gateway as a reverse proxy
  trustProxy: true,
  // Fastify ajv + formats (UUID, date-time)
  ajv: {
    customOptions: {
      formats: {
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        'date-time': true, // allow Fastify to use the built-in format checker
      },
    },
  },
});

// ─── Plugin registration (order matters) ─────────────────────────────────────
// 1. Database connection
await fastify.register(prismaPlugin);

// 2. Parse X-User header from API Gateway (applied globally as preHandler)
await fastify.register(xUserPlugin);

// ─── Route registration ───────────────────────────────────────────────────────
await fastify.register(ticketRoutes);
await fastify.register(commentRoutes);

// ─── Health check (no auth) ───────────────────────────────────────────────────
fastify.get('/health', async () => ({
  status:    'ok',
  service:   'tickets-service',
  timestamp: new Date().toISOString(),
  uptime:    process.uptime(),
  env:       process.env.NODE_ENV ?? 'development',
}));

// ─── Universal JSON response schema (SxTK) ───────────────────────────────────

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error({ err: error, url: request.url }, 'Unhandled error');
  const statusCode = error.statusCode ?? 500;
  return reply.code(statusCode).send({
    statusCode,
    intOpCode: `SxTK${statusCode}`,
    data:    null,
    error:   error.name ?? 'Internal Server Error',
    message: statusCode < 500 ? error.message : 'An unexpected error occurred.',
  });
});

fastify.setNotFoundHandler((request, reply) => {
  return reply.code(404).send({
    statusCode: 404,
    intOpCode:  'SxTK404',
    data:       null,
    error:      'Not Found',
    message:    `Route ${request.method} ${request.url} not found.`,
  });
});

// Wrap every response in the universal schema
fastify.addHook('onSend', (_request, reply, payload, done) => {
  if (reply.statusCode === 204 || payload == null) return done(null, payload);

  let parsed;
  try {
    parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch {
    return done(null, payload);
  }

  if (parsed?.intOpCode) return done(null, typeof payload === 'string' ? payload : JSON.stringify(parsed));

  const statusCode = reply.statusCode;
  const intOpCode  = `SxTK${statusCode}`;

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
const PORT = parseInt(process.env.PORT ?? '3003', 10);

try {
  await fastify.listen({ host: HOST, port: PORT });
  fastify.log.info(`[server] Tickets Service listening on http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error({ err }, '[server] failed to start');
  process.exit(1);
}
