// groups-service/src/routes/groups.js
// ─── Groups routes ────────────────────────────────────────────────────────────

// ── Shared helpers ─────────────────────────────────────────────────────────────

const MASTER_EMAIL = 'super@erp.com';

export const isMasterUser = (user) =>
  (user?.email?.toLowerCase?.() ?? '') === MASTER_EMAIL || user?.role === 'superAdmin';

export const hasPerm = (user, perm) =>
  Array.isArray(user?.permissions) && user.permissions.includes(perm);

/**
 * Returns true if the user is the 'owner' of the group OR is admin/superAdmin.
 * @param {object}  user     - request.user
 * @param {string}  groupId  - UUID
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function isOwnerOrAdmin(user, groupId, prisma) {
  if (isMasterUser(user) || hasPerm(user, 'edit_groups')) return true;
  const membership = await prisma.groupMember.findFirst({
    where: { group_id: groupId, user_id: user.id, role: 'owner' },
  });
  return membership !== null;
}

// ── JSON Schemas ───────────────────────────────────────────────────────────────

const GROUP_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

const idParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

const listQuerySchema = {
  type: 'object',
  properties: {
    page:        { type: 'integer', minimum: 1,  default: 1  },
    limit:       { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    category_id: { type: 'string', format: 'uuid' },
    level:       { type: 'string', enum: GROUP_LEVELS },
    is_active:   { type: 'boolean' },
  },
  additionalProperties: false,
};

const createBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name:        { type: 'string', minLength: 1, maxLength: 150 },
    description: { type: 'string' },
    category_id: { type: 'string', format: 'uuid' },
    level:       { type: 'string', enum: GROUP_LEVELS },
  },
  additionalProperties: false,
};

const updateBodySchema = {
  type: 'object',
  properties: {
    name:        { type: 'string', minLength: 1, maxLength: 150 },
    description: { type: 'string' },
    category_id: { type: ['string', 'null'], format: 'uuid' },
    level:       { type: 'string', enum: GROUP_LEVELS },
    is_active:   { type: 'boolean' },
  },
  additionalProperties: false,
  minProperties: 1,
};

// ── Route plugin ───────────────────────────────────────────────────────────────

export default async function groupRoutes(fastify) {
  const prisma = fastify.prisma;

  /**
   * Fetch a group by ID, throwing 404 if not found.
   */
  async function requireGroup(id, reply) {
    const group = await prisma.group.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!group) {
      reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Group ${id} not found.`,
      });
      return null;
    }
    return group;
  }

  // ── GET /groups ─────────────────────────────────────────────────────────────
  fastify.get('/groups', {
    schema: { querystring: listQuerySchema },
  }, async (request) => {
    const { page, limit, category_id, level, is_active } = request.query;
    const user   = request.user;
    const offset = (page - 1) * limit;

    // Build filters
    const where = {};
    if (category_id !== undefined) where.category_id = category_id;
    if (level       !== undefined) where.level       = level;
    if (is_active   !== undefined) where.is_active   = is_active;

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip:    offset,
        take:    limit,
        orderBy: { created_at: 'desc' },
        include: {
          category: true,
          _count:   { select: { members: true } },
        },
      }),
      prisma.group.count({ where }),
    ]);

    // Rename _count.members → member_count for cleaner API surface
    const data = groups.map(({ _count, ...g }) => ({
      ...g,
      member_count: _count.members,
    }));

    return { data, total, page, limit };
  });

  // ── GET /groups/:id ─────────────────────────────────────────────────────────
  fastify.get('/groups/:id', {
    schema: { params: idParamSchema },
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.user;

    const group = await prisma.group.findUnique({
      where:   { id },
      include: {
        category: true,
        members:  { orderBy: { joined_at: 'asc' } },
        _count:   { select: { members: true } },
      },
    });

    if (!group) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Group ${id} not found.`,
      });
    }

    const { _count, ...rest } = group;
    return { ...rest, member_count: _count.members };
  });

  // ── POST /groups ────────────────────────────────────────────────────────────
  fastify.post('/groups', {
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

    const { name, description, category_id, level } = request.body;

    // Validate category exists (if provided)
    if (category_id) {
      const cat = await prisma.groupCategory.findUnique({ where: { id: category_id } });
      if (!cat) {
        return reply.code(404).send({
          statusCode: 404,
          error:      'Not Found',
          message:    `Category ${category_id} not found.`,
        });
      }
    }

    // Create group + owner membership atomically
    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          name,
          description: description ?? null,
          category_id: category_id ?? null,
          level:       level       ?? 'beginner',
        },
      });

      await tx.groupMember.create({
        data: {
          group_id: created.id,
          user_id:  user.id,
          role:     'owner',
        },
      });

      return created;
    });

    return reply.code(201).send(group);
  });

  // ── PATCH /groups/:id ───────────────────────────────────────────────────────
  fastify.patch('/groups/:id', {
    schema: {
      params: idParamSchema,
      body:   updateBodySchema,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.user;

    const group = await requireGroup(id, reply);
    if (!group) return;

    const allowed = await isOwnerOrAdmin(user, id, prisma);
    if (!allowed) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Only the group owner or an admin can edit this group.',
      });
    }

    // Validate new category if provided
    const { category_id } = request.body;
    if (category_id && category_id !== null) {
      const cat = await prisma.groupCategory.findUnique({ where: { id: category_id } });
      if (!cat) {
        return reply.code(404).send({
          statusCode: 404,
          error:      'Not Found',
          message:    `Category ${category_id} not found.`,
        });
      }
    }

    const data  = {};
    const body  = request.body;
    if ('name'        in body) data.name        = body.name;
    if ('description' in body) data.description = body.description;
    if ('category_id' in body) data.category_id = body.category_id;
    if ('level'       in body) data.level       = body.level;
    if ('is_active'   in body) data.is_active   = body.is_active;

    const updated = await prisma.group.update({
      where: { id },
      data,
      include: { category: true },
    });

    return updated;
  });

  // ── DELETE /groups/:id (soft delete → is_active = false) ───────────────────
  fastify.delete('/groups/:id', {
    schema: { params: idParamSchema },
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.user;

    if (!isMasterUser(user) && !hasPerm(user, 'delete_groups')) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Missing permission: delete_groups',
      });
    }

    const group = await requireGroup(id, reply);
    if (!group) return;

    if (!group.is_active) {
      return reply.code(409).send({
        statusCode: 409,
        error:      'Conflict',
        message:    'Group is already inactive.',
      });
    }

    const updated = await prisma.group.update({
      where: { id },
      data:  { is_active: false },
    });

    return updated;
  });
}
