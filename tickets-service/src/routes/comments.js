// tickets-service/src/routes/comments.js
// ─── Comment routes ───────────────────────────────────────────────────────────

const isMasterUser = (user) =>
  (user?.email?.toLowerCase?.() ?? '') === 'super@erp.com' || user?.role === 'superAdmin';

const hasPerm = (user, perm) => {
  if (!Array.isArray(user.permissions)) return false;
  const aliases = {
    view_tickets: ['view_tickets', 'manage_tickets'],
    create_tickets: ['create_tickets', 'manage_tickets'],
    edit_tickets: ['edit_tickets', 'manage_tickets'],
    delete_tickets: ['delete_tickets', 'manage_tickets'],
  };
  const accepted = aliases[perm] ?? [perm];
  return user.permissions.some((p) => accepted.includes(p));
};

// ── JSON Schemas ──────────────────────────────────────────────────────────────

const ticketIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

const commentParamsSchema = {
  type: 'object',
  required: ['ticketId', 'commentId'],
  properties: {
    ticketId:  { type: 'string', format: 'uuid' },
    commentId: { type: 'string', format: 'uuid' },
  },
};

const createCommentBodySchema = {
  type: 'object',
  required: ['content'],
  properties: {
    content: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
};

const listQuerySchema = {
  type: 'object',
  properties: {
    page:  { type: 'integer', minimum: 1, default: 1  },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
  additionalProperties: false,
};

// ── Route plugin ──────────────────────────────────────────────────────────────

export default async function commentRoutes(fastify) {
  const prisma = fastify.prisma;

  /**
   * Verify that the ticket exists and that the requester has access.
   * Non-admins can only interact with tickets they created.
   * Returns the ticket or throws an HTTP error.
   */
  async function guardTicket(id, user, reply) {
    const ticket = await prisma.ticket.findUnique({ where: { id } });

    if (!ticket) {
      reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Ticket ${id} not found.`,
      });
      return null;
    }

    const isInvolved = ticket.creator_id === user.id || ticket.assignee_id === user.id;
    if (!isMasterUser(user) && !isInvolved && !hasPerm(user, 'view_tickets')) {
      reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'You do not have access to this ticket.',
      });
      return null;
    }

    return ticket;
  }

  // ── GET /tickets/:id/comments ──────────────────────────────────────────────
  fastify.get('/tickets/:id/comments', {
    schema: {
      params:      ticketIdParamSchema,
      querystring: listQuerySchema,
    },
  }, async (request, reply) => {
    const { id }     = request.params;
    const { page, limit } = request.query;
    const user       = request.user;
    const offset     = (page - 1) * limit;

    const ticket = await guardTicket(id, user, reply);
    if (!ticket) return; // reply already sent

    const [data, total] = await Promise.all([
      prisma.ticketComment.findMany({
        where:   { ticket_id: id },
        skip:    offset,
        take:    limit,
        orderBy: { created_at: 'asc' },
      }),
      prisma.ticketComment.count({ where: { ticket_id: id } }),
    ]);

    return { data, total, page, limit };
  });

  // ── POST /tickets/:id/comments ─────────────────────────────────────────────
  fastify.post('/tickets/:id/comments', {
    schema: {
      params: ticketIdParamSchema,
      body:   createCommentBodySchema,
    },
  }, async (request, reply) => {
    const { id }    = request.params;
    const { content } = request.body;
    const user      = request.user;

    // The ticket must exist; any authenticated user who can see the ticket can comment
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Ticket ${id} not found.`,
      });
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticket_id: id,
        author_id: user.id,
        content,
      },
    });

    return reply.code(201).send(comment);
  });

  // ── DELETE /tickets/:ticketId/comments/:commentId ──────────────────────────
  fastify.delete('/tickets/:ticketId/comments/:commentId', {
    schema: { params: commentParamsSchema },
  }, async (request, reply) => {
    const { ticketId, commentId } = request.params;
    const user                    = request.user;

    // Verify ticket exists
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Ticket ${ticketId} not found.`,
      });
    }

    // Verify comment exists and belongs to the ticket
    const comment = await prisma.ticketComment.findFirst({
      where: { id: commentId, ticket_id: ticketId },
    });
    if (!comment) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Comment ${commentId} not found on ticket ${ticketId}.`,
      });
    }

    if (!isMasterUser(user) && comment.author_id !== user.id && !hasPerm(user, 'delete_tickets')) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Missing permission: delete_tickets',
      });
    }

    await prisma.ticketComment.delete({ where: { id: commentId } });

    return reply.code(204).send();
  });
}
