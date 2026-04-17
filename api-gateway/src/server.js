import 'dotenv/config';
import Fastify from 'fastify';

// ─── Plugins ─────────────────────────────────────────────────────────────────
import helmetPlugin    from './plugins/helmet.js';
import corsPlugin      from './plugins/cors.js';
import redisPlugin     from './plugins/redis.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import jwtPlugin       from './plugins/jwt.js';

// ─── Routes ──────────────────────────────────────────────────────────────────
import authRoutes    from './routes/auth.js';
import metricsRoutes from './routes/metrics.js';
import proxyRoutes   from './routes/proxy.js';

// ─── Logger setup ─────────────────────────────────────────────────────────────

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
  // Use request id header if provided by load-balancer, otherwise generate one
  genReqId(req) {
    return req.headers['x-request-id'] ?? crypto.randomUUID();
  },
  // Trust X-Forwarded-For from reverse proxies
  trustProxy: true,
});

// ─── Plugin registration (order matters) ─────────────────────────────────────
// helmet & cors first — applied before any processing
fastify.register(helmetPlugin);
fastify.register(corsPlugin);

// redis before rate-limit (rate-limit depends on fastify.redisClient decorator)
fastify.register(redisPlugin);
fastify.register(rateLimitPlugin);

// jwt after redis (no hard dependency, but logical order)
fastify.register(jwtPlugin);

// ─── Route registration ───────────────────────────────────────────────────────
fastify.register(authRoutes,    { prefix: '/auth' });
fastify.register(metricsRoutes, { prefix: '/api'  });
fastify.register(proxyRoutes,   { prefix: '/api'  });

// ─── Health check (no auth required) ─────────────────────────────────────────
fastify.get('/health', {
  config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
}, async () => ({
  statusCode: 200,
  intOpCode:  'SxGW200',
  data: {
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
    env:       process.env.NODE_ENV ?? 'development',
  },
}));

// ─── Request timing ──────────────────────────────────────────────────────
fastify.addHook('onRequest', (request, _reply, done) => {
  request.startTime = Date.now();
  done();
});

// ─── Fire-and-forget logs & metrics ──────────────────────────────────────

const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';
const SERVICE_RESOURCE_MAP = {
  users: 'users-service', groups: 'groups-service', tickets: 'tickets-service',
};

function resolveService(url) {
  const segment = (url.replace(/^\/api/, '').split('/').filter(Boolean)[0] || '').toLowerCase();
  return SERVICE_RESOURCE_MAP[segment] || 'api-gateway';
}

fastify.addHook('onResponse', (request, reply, done) => {
  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
  const elapsed = Date.now() - (request.startTime || Date.now());
  const statusCode = reply.statusCode;
  const endpoint = request.url;
  const method = request.method;
  const userId = request.user?.id || null;
  const ip = request.ip;
  const service = resolveService(request.url);
  const errorStack = statusCode >= 400 ? (reply.errorStack || null) : null;

  const headers = {
    'Content-Type': 'application/json',
    'X-Internal-Secret': INTERNAL_SECRET,
  };

  // Fire-and-forget: log
  fetch(`${userServiceUrl}/internal/logs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ endpoint, method, userId, ip, statusCode, service, errorStack }),
    signal: AbortSignal.timeout(5_000),
  }).catch(err => fastify.log.warn({ err: err.message }, '[logs] failed to save log'));

  // Fire-and-forget: metric
  fetch(`${userServiceUrl}/internal/metrics`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ endpoint, method, responseTimeMs: elapsed }),
    signal: AbortSignal.timeout(5_000),
  }).catch(err => fastify.log.warn({ err: err.message }, '[metrics] failed to save metric'));

  done();
});

// ─── Universal JSON response schema (SxGW) ───────────────────────────────────

// Decorator: routes can attach a serviceCode from upstream microservices
fastify.decorateReply('serviceCode', null);

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error({ err: error, url: request.url }, 'Unhandled error');
  const statusCode = error.statusCode ?? 500;
  return reply.code(statusCode).send({
    statusCode,
    intOpCode: `SxGW${statusCode}`,
    data:    null,
    error:   error.name ?? 'Internal Server Error',
    message: statusCode < 500 ? error.message : 'An unexpected error occurred.',
  });
});

fastify.setNotFoundHandler((request, reply) => {
  return reply.code(404).send({
    statusCode: 404,
    intOpCode:  'SxGW404',
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

  // Already wrapped (from error handler, 404 handler, or route)
  if (parsed?.intOpCode) return done(null, typeof payload === 'string' ? payload : JSON.stringify(parsed));

  const statusCode = reply.statusCode;
  const intOpCode  = `SxGW${statusCode}`;

  const wrapped = statusCode >= 400
    ? { statusCode, intOpCode, data: null, error: parsed.error ?? 'Error', message: parsed.message ?? 'An error occurred.' }
    : { statusCode, intOpCode, data: parsed };

  // Include serviceCode if an upstream microservice was called
  if (reply.serviceCode) {
    wrapped.serviceCode = reply.serviceCode;
  }

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
const PORT = parseInt(process.env.PORT ?? '3000', 10);

try {
  await fastify.listen({ host: HOST, port: PORT });
  console.log('Server listening on port', PORT);
  fastify.log.info(`[server] API Gateway listening on http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error({ err }, '[server] failed to start');
  process.exit(1);
}
