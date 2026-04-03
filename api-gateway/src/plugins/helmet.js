import fp from 'fastify-plugin';
import fastifyHelmet from '@fastify/helmet';

/**
 * Helmet — sets secure HTTP response headers.
 */
async function helmetPlugin(fastify) {
  await fastify.register(fastifyHelmet, {
    // Content-Security-Policy is relaxed for API gateway (no HTML served)
    contentSecurityPolicy: false,
    // Allow cross-origin requests needed by microservices architecture
    crossOriginEmbedderPolicy: false,
  });
}

export default fp(helmetPlugin, { name: 'helmet' });
