import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';

/**
 * CORS — allows the Angular dev server and any configured frontend origin.
 */
async function corsPlugin(fastify) {
  await fastify.register(fastifyCors, {
    origin: [
      'http://localhost:4200',  // Angular dev server
      'http://localhost:4000',  // Secondary frontend / SSR
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400, // preflight cache: 24 h
  });
}

export default fp(corsPlugin, { name: 'cors' });
