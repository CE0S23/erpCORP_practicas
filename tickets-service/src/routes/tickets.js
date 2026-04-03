// tickets-service/src/routes/tickets.js
// ─── Tickets routes ───────────────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the user has admin-level access */
const isAdmin = (user) =>
  user.role === 'admin' || user.role === 'superAdmin';

/**
 * Record one history entry in ticket_history.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ ticket_id: string, changed_by: string, field_changed: string, old_value?: string|null, new_value?: string|null }} entry
 */
async function addHistory(prisma, { ticket_id, changed_by, field_changed, old_value, new_value }) {
  await prisma.ticketHistory.create({
    data: {
      ticket_id,
      changed_by,
      field_changed,
      old_value:  old_value  != null ? String(old_value)  : null,
      new_value:  new_value  != null ? String(new_value)  : null,
    },
  });
}

/**
 * Compare old vs new and record a history entry for every changed field.
 * The fields array lists the mutable fields we want to track.
 */
const TRACKED_FIELDS = [
  'title', 'description', 'status', 'priority',
  'assignee_id', 'group_id', 'due_date',
];

async function recordFieldChanges(prisma, { ticket, updates, changed_by }) {
  const entries = [];

  for (const field of TRACKED_FIELDS) {
    if (!(field in updates)) continue;

    const oldVal = ticket[field] != null ? String(ticket[field]) : null;
    const newVal = updates[field] != null ? String(updates[field]) : null;

    // Normalize dates for comparison
    const normalizedOld = ticket[field] instanceof Date ? ticket[field].toISOString() : oldVal;
    const normalizedNew = updates[field] instanceof Date ? updates[field].toISOString() : newVal;

    if (normalizedOld !== normalizedNew) {
      entries.push(
        addHistory(prisma, {
          ticket_id:     ticket.id,
          changed_by,
          field_changed: field,
          old_value:     normalizedOld,
          new_value:     normalizedNew,
        }),
      );
    }
  }

  await Promise.all(entries);
}

// ── JSON Schemas ──────────────────────────────────────────────────────────────

const ticketStatusEnum    = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'];
const ticketPriorityEnum  = ['low', 'medium', 'high', 'critical'];

const createBodySchema = {
  type: 'object',
  required: ['title'],
  properties: {
    title:       { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string' },
    status:      { type: 'string', enum: ticketStatusEnum },
    priority:    { type: 'string', enum: ticketPriorityEnum },
    assignee_id: { type: 'string', format: 'uuid' },
    group_id:    { type: 'string', format: 'uuid' },
    due_date:    { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
};

const updateBodySchema = {
  type: 'object',
  properties: {
    title:       { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string' },
    status:      { type: 'string', enum: ticketStatusEnum },
    priority:    { type: 'string', enum: ticketPriorityEnum },
    assignee_id: { type: ['string', 'null'], format: 'uuid' },
    group_id:    { type: ['string', 'null'], format: 'uuid' },
    due_date:    { type: ['string', 'null'], format: 'date-time' },
  },
  additionalProperties: false,
  minProperties: 1,
};

const listQuerySchema = {
  type: 'object',
  properties: {
    page:        { type: 'integer', minimum: 1,  default: 1  },
    limit:       { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status:      { type: 'string', enum: ticketStatusEnum },
    priority:    { type: 'string', enum: ticketPriorityEnum },
    group_id:    { type: 'string', format: 'uuid' },
    assignee_id: { type: 'string', format: 'uuid' },
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

export default async function ticketRoutes(fastify) {
  const prisma = fastify.prisma;

  // ── GET /tickets ────────────────────────────────────────────────────────────
  fastify.get('/tickets', {
    schema: { querystring: listQuerySchema },
  }, async (request) => {
    const { page, limit, status, priority, group_id, assignee_id } = request.query;
    const user   = request.user;
    const offset = (page - 1) * limit;

    // Build dynamic where clause
    const where = {};

    // Non-admins only see their own tickets
    if (!isAdmin(user)) {
      where.creator_id = user.id;
    }

    if (status)      where.status      = status;
    if (priority)    where.priority    = priority;
    if (group_id)    where.group_id    = group_id;
    if (assignee_id) where.assignee_id = assignee_id;

    const [data, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip:    offset,
        take:    limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { data, total, page, limit };
  });

  // ── GET /tickets/:id ────────────────────────────────────────────────────────
  fastify.get('/tickets/:id', {
    schema: { params: idParamSchema },
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.user;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        comments: {
          orderBy: { created_at: 'asc' },
        },
        history: {
          orderBy: { changed_at: 'desc' },
          take:    10,
        },
      },
    });

    if (!ticket) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Ticket ${id} not found.`,
      });
    }

    // Non-admin users can only see their own tickets
    if (!isAdmin(user) && ticket.creator_id !== user.id) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'You do not have permission to view this ticket.',
      });
    }

    return ticket;
  });

  // ── POST /tickets ───────────────────────────────────────────────────────────
  fastify.post('/tickets', {
    schema: { body: createBodySchema },
  }, async (request, reply) => {
    const user = request.user;
    const {
      title, description, status, priority,
      assignee_id, group_id, due_date,
    } = request.body;

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description: description ?? null,
        status:      status      ?? 'open',
        priority:    priority    ?? 'medium',
        creator_id:  user.id,
        assignee_id: assignee_id ?? null,
        group_id:    group_id    ?? null,
        due_date:    due_date    ? new Date(due_date) : null,
      },
    });

    // Record creation event in history
    await addHistory(prisma, {
      ticket_id:     ticket.id,
      changed_by:    user.id,
      field_changed: 'created',
      old_value:     null,
      new_value:     title,
    });

    return reply.code(201).send(ticket);
  });

  // ── PATCH /tickets/:id ──────────────────────────────────────────────────────
  fastify.patch('/tickets/:id', {
    schema: {
      params: idParamSchema,
      body:   updateBodySchema,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.user;

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Ticket ${id} not found.`,
      });
    }

    // Only creator or admin can modify
    if (!isAdmin(user) && existing.creator_id !== user.id) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Only the ticket creator or an admin can modify this ticket.',
      });
    }

    // Build the Prisma data object — only include fields present in body
    const updates = {};
    const body    = request.body;

    if ('title'       in body) updates.title       = body.title;
    if ('description' in body) updates.description = body.description;
    if ('status'      in body) updates.status      = body.status;
    if ('priority'    in body) updates.priority    = body.priority;
    if ('assignee_id' in body) updates.assignee_id = body.assignee_id;
    if ('group_id'    in body) updates.group_id    = body.group_id;
    if ('due_date'    in body) updates.due_date    = body.due_date ? new Date(body.due_date) : null;

    // Record field-level changes before applying the update
    await recordFieldChanges(prisma, { ticket: existing, updates, changed_by: user.id });

    const updated = await prisma.ticket.update({
      where: { id },
      data:  updates,
    });

    return updated;
  });

  // ── DELETE /tickets/:id (soft delete → status = 'cancelled') ───────────────
  fastify.delete('/tickets/:id', {
    schema: { params: idParamSchema },
  }, async (request, reply) => {
    const { id } = request.params;
    const user   = request.user;

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error:      'Not Found',
        message:    `Ticket ${id} not found.`,
      });
    }

    // Only creator or admin can cancel
    if (!isAdmin(user) && existing.creator_id !== user.id) {
      return reply.code(403).send({
        statusCode: 403,
        error:      'Forbidden',
        message:    'Only the ticket creator or an admin can cancel this ticket.',
      });
    }

    // If already cancelled, return early
    if (existing.status === 'cancelled') {
      return reply.code(409).send({
        statusCode: 409,
        error:      'Conflict',
        message:    'Ticket is already cancelled.',
      });
    }

    // Soft delete
    const updated = await prisma.ticket.update({
      where: { id },
      data:  { status: 'cancelled' },
    });

    // Record cancellation in history
    await addHistory(prisma, {
      ticket_id:     id,
      changed_by:    user.id,
      field_changed: 'status',
      old_value:     existing.status,
      new_value:     'cancelled',
    });

    return updated;
  });
}
