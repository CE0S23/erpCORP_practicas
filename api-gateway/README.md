# API Gateway — ERP de Grupos y Tickets

Gateway centralizado para la arquitectura de microservicios del ERP.
Gestiona autenticación, autorización por permisos y enrutamiento al servicio correcto.

## Stack

| Paquete | Rol |
|---|---|
| **Fastify** | HTTP server (ESM, `type: "module"`) |
| **@fastify/jwt** | Firma y verificación de tokens (HS256, 2 h) |
| **@fastify/redis + ioredis** | Blacklist de tokens en logout |
| **@fastify/rate-limit** | 100 req/min global; 10 req/min en `/auth/login` |
| **@fastify/cors** | Permite `localhost:4200` y `localhost:4000` |
| **@fastify/helmet** | Headers de seguridad HTTP |
| **dotenv** | Variables de entorno |
| **pino-pretty** | Logs legibles en desarrollo |

---

## Estructura

```
api-gateway/
├── src/
│   ├── server.js              # Bootstrap: plugins + rutas + graceful shutdown
│   ├── plugins/
│   │   ├── cors.js            # @fastify/cors
│   │   ├── helmet.js          # @fastify/helmet
│   │   ├── redis.js           # @fastify/redis + ioredis (cliente compartido)
│   │   ├── rate-limit.js      # @fastify/rate-limit con Redis store
│   │   └── jwt.js             # @fastify/jwt (HS256, 2 h)
│   └── routes/
│       ├── auth.js            # POST /auth/login | POST /auth/logout | GET /auth/me
│       └── proxy.js           # ALL /api/* → microservicio correspondiente
├── .env.example
└── package.json
```

---

## Instalación y arranque

```bash
cd api-gateway

# 1. Copiar variables de entorno
cp .env.example .env
#    Editar .env — especialmente JWT_SECRET (mínimo 32 chars)

# 2. Instalar dependencias
npm install

# 3. Desarrollo (recarga automática)
npm run dev

# 4. Producción
npm start
```

> **Requisito:** Redis corriendo en la URL configurada en `REDIS_URL`.

---

## Variables de entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del gateway |
| `HOST` | `0.0.0.0` | Host de escucha |
| `NODE_ENV` | `development` | Activa pino-pretty en dev |
| `JWT_SECRET` | — | **Obligatorio.** Mínimo 32 caracteres |
| `REDIS_URL` | `redis://localhost:6379` | Conexión a Redis |
| `USER_SERVICE_URL` | `http://localhost:3001` | Microservicio de usuarios |
| `GROUPS_SERVICE_URL` | `http://localhost:3002` | Microservicio de grupos |
| `TICKETS_SERVICE_URL` | `http://localhost:3003` | Microservicio de tickets |

---

## Endpoints

### Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | No | Valida credenciales con `USER_SERVICE`, devuelve JWT |
| `POST` | `/auth/logout` | Bearer | Revoca el token (blacklist en Redis) |
| `GET` | `/auth/me` | Bearer | Devuelve el payload del JWT activo |
| `GET` | `/health` | No | Estado del gateway |

#### POST /auth/login — Body
```json
{ "email": "user@example.com", "password": "S3cure!" }
```

#### POST /auth/login — Response 200
```json
{
  "token": "eyJ...",
  "user": { "id": "1", "email": "...", "name": "...", "role": "admin", "permissions": ["view_tickets", ...] }
}
```

### Proxy (`/api/*`)

Todas las rutas requieren `Authorization: Bearer <token>`.

| Método | Ruta | Permiso requerido | Servicio destino |
|---|---|---|---|
| `GET` | `/api/users` | `view_users` | USER_SERVICE |
| `POST` | `/api/users` | `create_users` | USER_SERVICE |
| `PUT` | `/api/users/:id` | `edit_users` | USER_SERVICE |
| `DELETE` | `/api/users/:id` | `delete_users` | USER_SERVICE |
| `GET` | `/api/groups` | `view_groups` | GROUPS_SERVICE |
| `POST` | `/api/groups` | `create_groups` | GROUPS_SERVICE |
| `PUT` | `/api/groups/:id` | `edit_groups` | GROUPS_SERVICE |
| `DELETE` | `/api/groups/:id` | `delete_groups` | GROUPS_SERVICE |
| `GET` | `/api/tickets` | `view_tickets` | TICKETS_SERVICE |
| `POST` | `/api/tickets` | `create_tickets` | TICKETS_SERVICE |
| `PUT/PATCH/DELETE` | `/api/tickets/:id` | `manage_tickets` | TICKETS_SERVICE |

---

## Flujo por request en /api/*

```
Cliente
  │
  ├─ 1. onRequest: jwtVerify()          → 401 si inválido/expirado
  ├─ 2. onRequest: Redis blacklist?     → 401 si token revocado
  ├─ 3. preHandler: permission check    → 403 si permiso faltante
  └─ 4. handler: fetch(serviceUrl)      → 503 si servicio no responde
         + header X-User: {payload}
         + header X-Request-ID
         + header X-Forwarded-For
```

---

## Rate Limiting

| Ruta | Límite | Store |
|---|---|---|
| Todas | 100 req/min por IP | Redis |
| `POST /auth/login` | **10 req/min** por IP | Redis |

Cuando Redis no está disponible, el rate limit falla abierto (no bloquea peticiones).

---

## Roles y permisos del sistema

| Rol | Permisos |
|---|---|
| `superAdmin` | Todos |
| `admin` | Todos excepto algunos de superAdmin |
| `medium` | view/create/edit en tickets y groups |
| `user` | view en tickets y groups |

Los permisos se incluyen en el JWT y se verifican en cada request proxy sin consultar la BD.

---

## Microservicio USER_SERVICE — endpoint requerido

El gateway espera este endpoint en `USER_SERVICE_URL`:

```
POST /internal/verify-credentials
Body:    { "email": string, "password": string }
200 OK:  { "user": { id, email, name, role, permissions[] } }
401:     { "error": "Invalid credentials" }
```
