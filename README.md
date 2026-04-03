# erpCORP — Sistema ERP de Gestion de Proyectos

> Proyecto academico de Seguridad Informatica, 8vo cuatrimestre.
> Frontend Angular 19 + Backend con microservicios (Fastify / NestJS) + PostgreSQL (Neon).

---

## Arquitectura

```
┌─────────────────┐       ┌───────────────────┐       ┌─────────┐
│  Angular 19     │──────▶│  API Gateway      │──────▶│  Redis  │
│  SSR + Signals  │       │  Fastify :3000     │       │  :6379  │
│  PrimeNG 19     │       │  JWT / Rate Limit  │       └─────────┘
└─────────────────┘       └────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
      ┌──────────────┐    ┌──────────────┐    ┌───────────────┐
      │ User Service │    │Groups Service│    │Tickets Service│
      │ NestJS :3001 │    │Fastify :3002 │    │Fastify  :3003 │
      └──────┬───────┘    └──────┬───────┘    └───────┬───────┘
             │                   │                    │
             └───────────────────┼────────────────────┘
                                 ▼
                       ┌──────────────────┐
                       │  PostgreSQL      │
                       │  Neon (cloud)    │
                       └──────────────────┘
```

## Tecnologias

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Frontend | Angular (standalone, signals, zoneless) | 19 |
| UI Components | PrimeNG | 19 |
| Drag & Drop | Angular CDK | 19 |
| Graficas | Chart.js | 4 |
| API Gateway | Fastify + JWT + Rate Limit | 4 |
| User Service | NestJS + Prisma ORM | 10 |
| Groups Service | Fastify + Prisma ORM | 4 |
| Tickets Service | Fastify + Prisma ORM | 4 |
| Base de datos | PostgreSQL (Neon cloud) | 16 |
| Cache | Redis | 7 |

---

## Levantar el proyecto con Docker

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- Node.js >= 18 (para el frontend)
- Cuenta en [Neon](https://neon.tech/) con una base de datos PostgreSQL creada

### 1. Clonar el repositorio

```bash
git clone https://github.com/CE0S23/erpCORP_practicas.git
cd erpCORP_practicas
```

### 2. Configurar variables de entorno

Cada servicio tiene un `.env.example`. Copia y configura cada uno:

```bash
cp api-gateway/.env.example api-gateway/.env
cp user-service/.env.example user-service/.env
cp groups-service/.env.example groups-service/.env
cp tickets-service/.env.example tickets-service/.env
```

**Variables clave:**

| Variable | Servicio(s) | Descripcion |
|----------|------------|-------------|
| `JWT_SECRET` | api-gateway | Secreto para firmar JWT (minimo 32 caracteres) |
| `DATABASE_URL` | user-service, groups-service, tickets-service | URL de conexion PostgreSQL (Neon) |
| `INTERNAL_SECRET` | api-gateway, user-service | Secreto compartido para endpoints internos |
| `REDIS_URL` | api-gateway | En Docker se sobreescribe a `redis://redis:6379` |

### 3. Construir y levantar los servicios

```bash
docker compose up --build
```

Esto levanta automaticamente:

| Servicio | Puerto | Descripcion |
|----------|--------|-------------|
| redis | 6379 | Cache para rate limiting y blacklist de tokens |
| api-gateway | 3000 | Punto de entrada, JWT, proxy reverso, logs y metricas |
| user-service | 3001 | Usuarios, roles, permisos, logs centralizados, metricas |
| groups-service | 3002 | Grupos, categorias, miembros |
| tickets-service | 3003 | Tickets, comentarios, historial de cambios |

> Las migraciones de Prisma se ejecutan automaticamente al arranque (`npx prisma migrate deploy`).

### 4. Levantar el frontend

En otra terminal:

```bash
npm install
ng serve
```

Abrir `http://localhost:4200`. El frontend se conecta al API Gateway en `http://localhost:3000`.

### 5. Comandos utiles

```bash
# Ver logs de un servicio
docker compose logs -f api-gateway

# Detener todo
docker compose down

# Detener y limpiar volumenes (Redis data)
docker compose down -v

# Reconstruir un servicio especifico
docker compose up --build user-service
```

---

## Levantar sin Docker (desarrollo local)

Requiere Redis corriendo en `localhost:6379`.

```bash
# Terminal 1 — User Service
cd user-service && npm install && npx prisma migrate deploy && npm run start:dev

# Terminal 2 — Groups Service
cd groups-service && npm install && npx prisma migrate deploy && node src/server.js

# Terminal 3 — Tickets Service
cd tickets-service && npm install && npx prisma migrate deploy && node src/server.js

# Terminal 4 — API Gateway
cd api-gateway && npm install && node src/server.js

# Terminal 5 — Frontend Angular
npm install && ng serve
```

---

## Esquema de respuesta universal

Todas las respuestas del API siguen el formato:

```json
{
  "statusCode": 200,
  "intOpCode": "SxGW200",
  "serviceCode": "SxUS200",
  "data": { ... }
}
```

| Prefijo | Servicio |
|---------|----------|
| `SxGW` | API Gateway |
| `SxUS` | User Service |
| `SxGR` | Groups Service |
| `SxTK` | Tickets Service |

---

## Endpoints principales

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | Login (devuelve JWT) | No |
| POST | `/auth/logout` | Logout (blacklist en Redis) | JWT |
| GET | `/auth/me` | Perfil del usuario autenticado | JWT |
| GET | `/api/users` | Listar usuarios (paginado) | JWT + permiso |
| POST | `/api/users` | Crear usuario | JWT + permiso |
| GET | `/api/groups` | Listar grupos | JWT + permiso |
| POST | `/api/groups` | Crear grupo | JWT + permiso |
| GET | `/api/tickets` | Listar tickets | JWT + permiso |
| POST | `/api/tickets` | Crear ticket | JWT + permiso |
| GET | `/api/metrics` | Metricas de rendimiento | JWT |
| GET | `/health` | Health check del gateway | No |

---

## Sistema de Roles y Permisos

### Roles

| Rol | Descripcion |
|-----|-------------|
| superAdmin | Todos los permisos. Puede eliminar usuarios. |
| admin | Gestion de usuarios y permisos. No puede eliminar usuarios. |
| medium | Puede crear y editar tickets/grupos. |
| user | Solo lectura. |

### Permisos granulares

Cada usuario tiene un array `permissions[]` independiente de su rol, ajustable por admin/superAdmin.

Los permisos se organizan por seccion (Usuarios, Grupos, Tickets) con acciones: ver, crear, editar, eliminar y administrar.

---

## Logs y Metricas

El sistema registra automaticamente:

- **Logs centralizados:** Cada request al API Gateway se guarda en la tabla `logs` (endpoint, metodo, IP, usuario, status code, servicio, error stack).
- **Metricas de rendimiento:** Tiempo de respuesta por endpoint en la tabla `metrics` (count, total ms, promedio). Consultables via `GET /api/metrics`.

Ambos se envian de forma asincrona (fire-and-forget) para no afectar el rendimiento.

---

## Estructura del proyecto

```
├── api-gateway/           # Fastify — JWT, rate limit, proxy, logs/metricas
│   └── src/
│       ├── plugins/       # helmet, cors, redis, rate-limit, jwt
│       └── routes/        # auth, proxy, metrics
├── user-service/          # NestJS — usuarios, roles, permisos, logs, metricas
│   ├── prisma/            # Schema + migraciones
│   └── src/
│       ├── users/         # Controllers, service, guards, DTOs
│       ├── logs/          # Logs y metricas (endpoints internos)
│       ├── prisma/        # PrismaService
│       └── common/        # Interceptor de respuesta, filtro de excepciones
├── groups-service/        # Fastify — grupos, categorias, miembros
│   ├── prisma/
│   └── src/
├── tickets-service/       # Fastify — tickets, comentarios, historial
│   ├── prisma/
│   └── src/
├── src/                   # Angular 19 frontend
│   └── app/
│       ├── components/    # sidebar, perfil, usuarios
│       ├── directives/    # hasPermission, hasRole
│       ├── group/         # Kanban + lista + gestion de miembros
│       ├── interceptors/  # auth, api-response, error
│       ├── models/        # role, user, ticket, group
│       ├── pages/         # home, login, register, tickets
│       └── services/      # auth, permission, ticket, group, error-handler
├── docker-compose.yml     # Orquestacion de todos los servicios
└── README.md
```

---

*Proyecto para la materia de Seguridad Informatica — Ing. en Informatica, 8vo cuatrimestre.*
