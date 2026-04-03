// tickets-service/src/plugins/prisma.js
// ─── PrismaClient singleton ───────────────────────────────────────────────────
// Registered as a Fastify plugin so that `fastify.prisma` is available in all
// routes. The connection is closed gracefully on Fastify shutdown.

import fp           from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

// Single instance shared across the process.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
});

async function prismaPlugin(fastify) {
  await prisma.$connect();
  fastify.log.info('[prisma] connected to database');

  // Expose as fastify.prisma
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    fastify.log.info('[prisma] disconnected from database');
  });
}

export default fp(prismaPlugin, {
  name:       'prisma',
  fastify:    '4.x',
});
