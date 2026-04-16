// groups-service/src/routes/categories.js
// ─── Categories routes ────────────────────────────────────────────────────────

// ── JSON Schemas ──────────────────────────────────────────────────────────────

const createBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name:  { type: 'string', minLength: 1, maxLength: 100 },
    color: { type: 'string', maxLength: 20 },
  },
  additionalProperties: false,
};

const idParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

// ── Route plugin ──────────────────────────────────────────────────────────────

export default async function categoryRoutes(fastify) {
  const prisma = fastify.prisma;

  const isMasterUser = (user) =>
    (user?.email?.toLowerCase?.() ?? '') === 'super@erp.com' || user?.role === 'superAdmin';

  const hasPerm = (user, perm) =>
    Array.isArray(user?.permissions) && user.permissions.includes(perm);

  // ── GET /categories ─────────────────────────────────────────────────────────
  fastify.get('/categories', async () => {
    const categories = await prisma.groupCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return categories;
  });

  // ── POST /categories ────────────────────────────────────────────────────────
  fastify.post('/categories', {
    schema: { body: createBodySchema },
  }, async (request, reply) => {
    const user = request.user;

    if (!isMasterUser(user) && !hasPerm(user, 'create_groups')) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Missing permission: create_groups',
      });
    }

    const { name, color } = request.body;
    const category = await prisma.groupCategory.create({
      data: { name, color: color ?? null },
    });

    return reply.code(201).send(category);
  });

  // ── DELETE /categories/:id ──────────────────────────────────────────────────
  fastify.delete('/categories/:id', {
    schema: { params: idParamSchema },
  }, async (request, reply) => {
    const user = request.user;
    const { id } = request.params;

    if (!isMasterUser(user) && !hasPerm(user, 'delete_groups')) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Missing permission: delete_groups',
      });
    }

    // Verify the category exists
    const category = await prisma.groupCategory.findUnique({ where: { id } });
    if (!category) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Category ${id} not found.`,
      });
    }

    // Check if any groups reference this category
    const groupCount = await prisma.group.count({
      where: { category_id: id },
    });

    if (groupCount > 0) {
      return reply.code(409).send({
        statusCode: 409,
        error:      'Conflict',
        message:    `Cannot delete category — ${groupCount} group(s) are still assigned to it.`,
      });
    }

    await prisma.groupCategory.delete({ where: { id } });
    return reply.code(204).send();
  });
}
