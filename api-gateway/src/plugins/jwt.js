import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

/**
 * JWT — signs/verifies tokens with HS256.
 * Tokens expire in 2 hours.
 *
 * Usage in handlers:
 *   await request.jwtVerify()          — verifies & populates request.user
 *   fastify.jwt.sign(payload)          — creates a new token
 *   fastify.jwt.decode(token)          — decodes without verification
 */
async function jwtPlugin(fastify) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      '[jwt] JWT_SECRET must be set and at least 32 characters long'
    );
  }

  await fastify.register(fastifyJwt, {
    secret,
    sign: {
      algorithm: 'HS256',
      expiresIn: '2h',
    },
    verify: {
      algorithms: ['HS256'],
    },
    // Read token from Authorization: Bearer <token>
    extractToken(request) {
      const auth = request.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        return auth.slice(7);
      }
      return null;
    },
  });
}

export default fp(jwtPlugin, { name: 'jwt' });
