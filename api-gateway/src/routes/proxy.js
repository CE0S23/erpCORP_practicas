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
  'PUT /api/users':    'edit_users',
  'DELETE /api/users': 'delete_users',

  // Groups
  'GET /api/groups':    'view_groups',
  'POST /api/groups':   'create_groups',
  'PUT /api/groups':    'edit_groups',
  'DELETE /api/groups': 'delete_groups',

  // Tickets
  'GET /api/tickets':    'view_tickets',
  'POST /api/tickets':   'create_tickets',
  'PUT /api/tickets':    'manage_tickets',
  'PATCH /api/tickets':  'manage_tickets',
  'DELETE /api/tickets': 'manage_tickets',
};

// ─── Service routing ─────────────────────────────────────────────────────────

const SERVICE_MAP = {
  users:   () => process.env.USER_SERVICE_URL    || 'http://localhost:3001',
  groups:  () => process.env.GROUPS_SERVICE_URL  || 'http://localhost:3002',
  tickets: () => process.env.TICKETS_SERVICE_URL || 'http://localhost:3003',
};

function getServiceUrl(resource) {
  return SERVICE_MAP[resource]?.() ?? null;
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
  });

  // ── Hook 3: Permission check ──────────────────────────────────────────────
  fastify.addHook('preHandler', async (request, reply) => {
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

    const userPermissions = request.user?.permissions ?? [];
    if (!userPermissions.includes(required)) {
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
