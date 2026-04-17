import fp from 'fastify-plugin';
import cors from '@fastify/cors';

export default fp(async function corsPlugin(fastify) {
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        origin.includes('localhost') ||
        origin.includes('vercel.app') ||
        origin.includes('railway.app')
      ) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    preflight: true,
    strictPreflight: false,
  });
});
