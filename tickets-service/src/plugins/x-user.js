// tickets-service/src/plugins/x-user.js
// ─── X-User header parser ─────────────────────────────────────────────────────
// The API Gateway forwards the authenticated user as a JSON string in the
// `X-User` header. This plugin parses it and attaches it to `request.user`.
// If the header is absent or malformed → 403 Forbidden.

import fp from 'fastify-plugin';

async function xUserPlugin(fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip health check — no auth needed
    if (request.url === '/health') return;

    const raw = request.headers['x-user'];
    if (!raw) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Missing X-User header — request must come through the API Gateway.',
      });
    }

    try {
      request.user = JSON.parse(raw);
    } catch {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Malformed X-User header.',
      });
    }
  });
}

export default fp(xUserPlugin, {
  name:    'x-user',
  fastify: '4.x',
});
