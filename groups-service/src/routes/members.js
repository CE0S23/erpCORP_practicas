// groups-service/src/routes/members.js
// ─── Group members routes ─────────────────────────────────────────────────────

import { isOwnerOrAdmin } from './groups.js';

// ── JSON Schemas ───────────────────────────────────────────────────────────────

const MEMBER_ROLES = ['owner', 'admin', 'member'];

const groupParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

const memberParamsSchema = {
  type: 'object',
  required: ['id', 'userId'],
  properties: {
    id:     { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
  },
};

const listQuerySchema = {
  type: 'object',
  properties: {
    page:  { type: 'integer', minimum: 1, default: 1  },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
  additionalProperties: false,
};

const addMemberBodySchema = {
  type: 'object',
  required: ['user_id'],
  properties: {
    user_id: { type: 'string', format: 'uuid' },
    role:    { type: 'string', enum: MEMBER_ROLES },
  },
  additionalProperties: false,
};

const updateRoleBodySchema = {
  type: 'object',
  required: ['role'],
  properties: {
    role: { type: 'string', enum: MEMBER_ROLES },
  },
  additionalProperties: false,
};

// ── Route plugin ───────────────────────────────────────────────────────────────

export default async function memberRoutes(fastify) {
  const prisma = fastify.prisma;

  /**
   * Verify group exists; send 404 and return null if not.
   */
  async function requireGroup(id, reply) {
    const group = await prisma.group.findUnique({ where: { id } });
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

  // ── GET /groups/:id/members ─────────────────────────────────────────────────
  fastify.get('/groups/:id/members', {
    schema: {
      params:      groupParamSchema,
      querystring: listQuerySchema,
    },
  }, async (request, reply) => {
    const { id }         = request.params;
    const { page, limit } = request.query;
    const offset          = (page - 1) * limit;

    const group = await requireGroup(id, reply);
    if (!group) return;

    const [data, total] = await Promise.all([
      prisma.groupMember.findMany({
        where:   { group_id: id },
        skip:    offset,
        take:    limit,
        orderBy: { joined_at: 'asc' },
        select:  { id: true, user_id: true, role: true, joined_at: true },
      }),
      prisma.groupMember.count({ where: { group_id: id } }),
    ]);

    return { data, total, page, limit };
  });

  // ── POST /groups/:id/members ────────────────────────────────────────────────
  fastify.post('/groups/:id/members', {
    schema: {
      params: groupParamSchema,
      body:   addMemberBodySchema,
    },
  }, async (request, reply) => {
    const { id }            = request.params;
    const { user_id, role } = request.body;
    const user              = request.user;

    const group = await requireGroup(id, reply);
    if (!group) return;

    const allowed = await isOwnerOrAdmin(user, id, prisma);
    if (!allowed) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Missing permission: edit_groups',
      });
    }

    // Check for duplicates
    const existing = await prisma.groupMember.findFirst({
      where: { group_id: id, user_id },
    });
    if (existing) {
      return reply.code(409).send({
        statusCode: 409,
        error:      'Conflict',
        message:    'User is already a member of this group.',
      });
    }

    const member = await prisma.groupMember.create({
      data: {
        group_id: id,
        user_id,
        role:     role ?? 'member',
      },
    });

    return reply.code(201).send(member);
  });

  // ── DELETE /groups/:id/members/:userId ──────────────────────────────────────
  fastify.delete('/groups/:id/members/:userId', {
    schema: { params: memberParamsSchema },
  }, async (request, reply) => {
    const { id, userId } = request.params;
    const user           = request.user;

    const group = await requireGroup(id, reply);
    if (!group) return;

    const allowed = await isOwnerOrAdmin(user, id, prisma);
    if (!allowed) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Missing permission: delete_groups',
      });
    }

    // Verify target membership exists
    const target = await prisma.groupMember.findFirst({
      where: { group_id: id, user_id: userId },
    });
    if (!target) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `User ${userId} is not a member of group ${id}.`,
      });
    }

    // Guard: cannot remove the last/sole owner
    if (target.role === 'owner') {
      const ownerCount = await prisma.groupMember.count({
        where: { group_id: id, role: 'owner' },
      });
      if (ownerCount <= 1) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    'Cannot remove the sole owner of the group. Assign another owner first.',
        });
      }
    }

    await prisma.groupMember.delete({ where: { id: target.id } });
    return reply.code(204).send();
  });

  // ── PATCH /groups/:id/members/:userId ───────────────────────────────────────
  fastify.patch('/groups/:id/members/:userId', {
    schema: {
      params: memberParamsSchema,
      body:   updateRoleBodySchema,
    },
  }, async (request, reply) => {
    const { id, userId } = request.params;
    const { role }       = request.body;
    const user           = request.user;

    const group = await requireGroup(id, reply);
    if (!group) return;

    const allowed = await isOwnerOrAdmin(user, id, prisma);
    if (!allowed) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Missing permission: edit_groups',
      });
    }

    // Verify target membership exists
    const target = await prisma.groupMember.findFirst({
      where: { group_id: id, user_id: userId },
    });
    if (!target) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `User ${userId} is not a member of group ${id}.`,
      });
    }

    // Guard: if downgrading an owner, make sure there's still at least one owner left
    if (target.role === 'owner' && role !== 'owner') {
      const ownerCount = await prisma.groupMember.count({
        where: { group_id: id, role: 'owner' },
      });
      if (ownerCount <= 1) {
        return reply.code(400).send({
          statusCode: 400,
          error:      'Bad Request',
          message:    'Cannot demote the sole owner. Assign another owner first.',
        });
      }
    }

    const updated = await prisma.groupMember.update({
      where: { id: target.id },
      data:  { role },
    });

    return updated;
  });
}
