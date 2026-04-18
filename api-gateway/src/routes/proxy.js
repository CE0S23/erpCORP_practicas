/**
 * Proxy routes  (/api/*)
 *
 * Every request to /api/* is:
 *   1. Authenticated  — JWT must be valid.
 *   2. Checked        — token must not be blacklisted in Redis.
 *   3. Authorised     — user must hold the required permission for the
 *                       method + resource combination.
 *   4. Forwarded      — request is proxied to the correct microservice
 *                       with the X-User header injected.
 */

// ─── Permission map ───────────────────────────────────────────────────────────
// Key pattern:  "<METHOD> /api/<resource>"
// Matches on the first path segment after /api (ignores sub-paths & params).

const PERMISSION_MAP = {
  // Users
  'GET /api/users':    'view_users',
  'POST /api/users':   'create_users',
  'PUT /api/users':    'edit_user',
  'PATCH /api/users':  'edit_user',
  'DELETE /api/users': 'delete_users',

  // Groups
  'GET /api/groups':    'view_groups',
  'POST /api/groups':   'create_groups',
  'PUT /api/groups':    'edit_groups',
  'PATCH /api/groups':  'edit_groups',
  'DELETE /api/groups': 'delete_groups',

  // Categories (managed via the groups service)
  'GET /api/categories':    'view_groups',
  'POST /api/categories':   'create_groups',
  'DELETE /api/categories': 'delete_groups',

  // Tickets
  'GET /api/tickets':    'view_tickets',
  'POST /api/tickets':   'create_tickets',
  'PUT /api/tickets':    'edit_tickets',
  'PATCH /api/tickets':  'edit_tickets',
  'DELETE /api/tickets': 'delete_tickets',
};

const LEGACY_PERMISSION_ALIASES = {
  view_tickets:   ['view_tickets', 'manage_tickets'],
  create_tickets: ['create_tickets', 'manage_tickets'],
  edit_tickets:   ['edit_tickets', 'manage_tickets'],
  delete_tickets: ['delete_tickets', 'manage_tickets'],

  view_groups:    ['view_groups', 'manage_groups'],
  create_groups:  ['create_groups', 'manage_groups'],
  edit_groups:    ['edit_groups', 'manage_groups'],
  delete_groups:  ['delete_groups', 'manage_groups'],

  view_users:     ['view_users', 'manage_users'],
  create_users:   ['create_users', 'manage_users'],
  edit_user:      ['edit_user', 'manage_users'],
  delete_users:   ['delete_users', 'manage_users'],
};

// ─── Service routing ─────────────────────────────────────────────────────────

const SERVICE_MAP = {
  users:      () => process.env.USER_SERVICE_URL    || 'http://localhost:3001',
  groups:     () => process.env.GROUPS_SERVICE_URL  || 'http://localhost:3002',
  categories: () => process.env.GROUPS_SERVICE_URL  || 'http://localhost:3002', // same service as groups
  tickets:    () => process.env.TICKETS_SERVICE_URL || 'http://localhost:3003',
};

const MASTER_EMAIL = 'super@erp.com';

function getServiceUrl(resource) {
  return SERVICE_MAP[resource]?.() ?? null;
}

function isMasterUser(user) {
  const email = user?.email?.toLowerCase?.() ?? '';
  return email === MASTER_EMAIL || user?.role === 'superAdmin';
}

function hasRequiredPermission(userPermissions, requiredPermission) {
  const allowedKeys = LEGACY_PERMISSION_ALIASES[requiredPermission] ?? [requiredPermission];
  return userPermissions.some((perm) => allowedKeys.includes(perm));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractToken(request) {
  const auth = request.headers.authorization ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

/**
 * Parses the raw request URL and returns:
 *   resource — first path segment after /api  (e.g. "users")
 *   targetPath — full path + query string WITHOUT the /api prefix
 */
function parseProxyUrl(rawUrl) {
  // rawUrl example:  "/api/users/123?foo=bar"
  const withoutPrefix = rawUrl.replace(/^\/api/, '') || '/';
  const resource = withoutPrefix.split('/').filter(Boolean)[0] ?? '';
  return { resource, targetPath: withoutPrefix };
}

async function fetchLiveUser(requestUser) {
  if (!requestUser?.id) return requestUser;

  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
  const response = await fetch(`${userServiceUrl}/users/profile/me`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-user': JSON.stringify(requestUser),
    },
    signal: AbortSignal.timeout(8_000),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message ?? 'Unable to refresh user permissions.');
    error.statusCode = response.status;
    throw error;
  }

  return body?.data ?? body;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function proxyRoutes(fastify) {
  // ── Hook 1: JWT verification ─────────────────────────────────────────────
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({
        statusCode: 401,
        intOpCode:  'SxGW401',
        data:       null,
        error:      'Unauthorized',
        message:    err.message,
      });
    }
  });

  // ── Hook 2: Token blacklist check ────────────────────────────────────────
  fastify.addHook('onRequest', async (request, reply) => {
    const token = extractToken(request);
    if (!token) return; // Already rejected by JWT hook above

    try {
      const blacklisted = await fastify.redis.get(`blacklist:${token}`);
      if (blacklisted) {
        return reply.code(401).send({
          statusCode: 401,
          intOpCode:  'SxGW401',
          data:       null,
          error:      'Unauthorized',
          message:    'Token has been revoked. Please log in again.',
        });
      }
    } catch {
      // Redis unavailable — skip blacklist check in dev
      fastify.log.warn('[proxy] Redis unavailable, skipping blacklist check');
    }
  });

  // ── Hook 3: Permission check ──────────────────────────────────────────────
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      request.user = await fetchLiveUser(request.user);
    } catch (err) {
      fastify.log.error({ err: err.message, userId: request.user?.id }, '[proxy] failed to refresh user');
      return reply.code(503).send({
        statusCode: 503,
        intOpCode:  'SxGW503',
        data:       null,
        error:      'Service Unavailable',
        message:    'Unable to validate your latest permissions right now. Please try again shortly.',
      });
    }

    const { resource } = parseProxyUrl(request.raw.url);
    const permKey = `${request.method} /api/${resource}`;
    const required = PERMISSION_MAP[permKey];

    if (!required) {
      return reply.code(403).send({
        statusCode: 403,
        intOpCode:  'SxGW403',
        data:       null,
        error:      'Forbidden',
        message:    `No permission policy defined for: ${request.method} /api/${resource}`,
      });
    }

    if (isMasterUser(request.user)) return;

    const userPermissions = Array.isArray(request.user?.permissions) ? request.user.permissions : [];
    if (!hasRequiredPermission(userPermissions, required)) {
      fastify.log.warn(
        { userId: request.user?.id, required, userPermissions },
        '[proxy] permission denied'
      );
      return reply.code(403).send({
        statusCode: 403,
        intOpCode:  'SxGW403',
        data:       null,
        error:      'Forbidden',
        message:    `You do not have the required permission: ${required}`,
      });
    }
  });

  // ── Catch-all proxy handler ───────────────────────────────────────────────
  // Registered at the root of the /api prefix; '*' captures everything after.
  fastify.route({
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    url: '/*',
    handler: async (request, reply) => {
      const { resource, targetPath } = parseProxyUrl(request.raw.url);

      const serviceUrl = getServiceUrl(resource);
      if (!serviceUrl) {
        return reply.code(404).send({
          statusCode: 404,
          intOpCode:  'SxGW404',
          data:       null,
          error:      'Not Found',
          message:    `No upstream service mapped for resource: "${resource}"`,
        });
      }

      const targetUrl = `${serviceUrl}${targetPath}`;

      // Build forwarded headers
      const forwardHeaders = {
        'content-type': 'application/json',
        'accept':        'application/json',
        // Inject authenticated user so downstream services trust it
        'x-user':        JSON.stringify(request.user),
        'x-request-id':  request.id,
        'x-forwarded-for': request.ip,
      };

      const fetchOptions = {
        method:  request.method,
        headers: forwardHeaders,
        // 10-second upstream timeout (requires Node ≥ 18)
        signal: AbortSignal.timeout(10_000),
      };

      // Attach body for methods that carry one
      const hasBody = !['GET', 'HEAD', 'DELETE'].includes(request.method);
      if (hasBody && request.body != null) {
        fetchOptions.body = JSON.stringify(request.body);
      }

      fastify.log.debug(
        { method: request.method, targetUrl, userId: request.user?.id },
        '[proxy] forwarding request'
      );

      let upstreamResponse;
      try {
        upstreamResponse = await fetch(targetUrl, fetchOptions);
      } catch (err) {
        const isNetworkError =
          err.name === 'TimeoutError' ||
          err.name === 'AbortError'   ||
          err.code  === 'ECONNREFUSED'||
          err.code  === 'ENOTFOUND'   ||
          err.code  === 'ECONNRESET';

        if (isNetworkError) {
          fastify.log.error(
            { err: err.message, targetUrl, resource },
            '[proxy] upstream service unavailable'
          );
          return reply.code(503).send({
            statusCode: 503,
            intOpCode:  'SxGW503',
            data:       null,
            error:      'Service Unavailable',
            message:    `The ${resource} service is currently unreachable. Please try again later.`,
          });
        }
        // Unexpected error — let Fastify's error handler deal with it
        throw err;
      }

      // Forward the upstream status code
      const upstreamStatus = upstreamResponse.status;
      reply.code(upstreamStatus);

      // Forward upstream headers that are safe to propagate
      const safeHeaders = ['cache-control', 'etag', 'last-modified'];
      for (const header of safeHeaders) {
        const value = upstreamResponse.headers.get(header);
        if (value) reply.header(header, value);
      }

      // Parse upstream body and extract service intOpCode
      const responseBody = await upstreamResponse.text();
      if (responseBody) {
        try {
          const upstream = JSON.parse(responseBody);

          // Extract the service's intOpCode for the gateway wrapper
          const serviceCode = upstream.intOpCode ?? null;
          if (serviceCode) reply.serviceCode = serviceCode;

          // Build the gateway envelope with the upstream data
          const gwResponse = {
            statusCode:  upstreamStatus,
            intOpCode:   `SxGW${upstreamStatus}`,
            ...(serviceCode && { serviceCode }),
            data:        upstream.data ?? null,
          };

          // Preserve error/message fields from upstream on error responses
          if (upstreamStatus >= 400) {
            gwResponse.error   = upstream.error   ?? 'Error';
            gwResponse.message = upstream.message  ?? 'An error occurred.';
          }

          return reply.send(gwResponse);
        } catch {
          // Non-JSON upstream response — wrap raw text
          return reply.send({
            statusCode: upstreamStatus,
            intOpCode:  `SxGW${upstreamStatus}`,
            data:       responseBody,
          });
        }
      }

      return reply.send({
        statusCode: upstreamStatus,
        intOpCode:  `SxGW${upstreamStatus}`,
        data:       null,
      });
    },
  });
}
