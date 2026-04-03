// groups-service/src/plugins/x-user.js
// ─── X-User header parser ─────────────────────────────────────────────────────
// The API Gateway forwards the authenticated user as a JSON string in X-User.
// Parses it and attaches to request.user. Returns 403 if missing/malformed.

import fp from 'fastify-plugin';

async function xUserPlugin(fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
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
