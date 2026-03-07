# ERPPro — Sistema ERP

> Angular 20 + PrimeNG | Practicas de Seguridad Informatica — César Ramírez

---

## Como correr el proyecto

```bash
npm start
```

Abre http://localhost:4200

---

## Estructura del Proyecto

```
src/app/
├── app.paths.ts           ← Rutas centralizadas del proyecto
├── models/
│   ├── user.model.ts
│   └── group.model.ts
├── components/
│   ├── custom-input/
│   ├── custom-button/
│   ├── custom-card/
│   ├── sidebar/
│   ├── n-display/
│   ├── advance-card/
│   └── profile-card/
├── pages/
│   ├── landing/
│   ├── login/
│   ├── register/
│   └── home/
├── group/
├── user/
├── layouts/
│   └── main-layout/
└── services/
    ├── auth.service.ts
    └── group.service.ts
```

---

## Credenciales de prueba

| Email           | Password       | Rol   |
|-----------------|----------------|-------|
| admin@erp.com   | Admin@Secure1  | admin |
| cesar@erp.com   | Cesar@Secure1  | user  |

---

## Historial de Practicas

### Practica 1 — Validacion de PrimeNG
Se instalo y configuro Angular v20 con PrimeNG v18 y el tema Aura.
- Proyecto creado con Angular CLI
- PrimeNG instalado y configurado en `app.config.ts`
- Boton `p-button` en la Home page para verificar instalacion correcta
- Servidor Express basico (`server.js`) como backend auxiliar

### Practica 2 — Landing, Login y Registro
Implementacion del flujo de autenticacion completo.
- Landing page con boton CTA al login
- Login con credenciales hardcodeadas (validacion en frontend)
- Formulario de registro con validaciones:
  - Contrasena: minimo 10 caracteres, mayuscula, numero, simbolo
  - Telefono: solo numeros
  - Edad: mayor de 18 anos
- Usuarios registrados guardados en memoria (AuthService)

### Practica 3 — Vistas Group y User con MainLayout
Navegacion interior con menu lateral y paginas de grupo y usuario.
- Sidebar colapsable con links a Home, Group y User
- MainLayout: sidebar + router-outlet
- Group: tabla basica con NDisplay y AdvanceCard
- User: Listbox para seleccionar usuario + ProfileCard con datos del usuario
- Rutas anidadas bajo `/home` con lazy loading

### Practica 4 — CRUD Group + RUD User + Rutas centralizadas
Nuevos avances en las vistas interiores con logica de negocio.
- **app.paths.ts**: archivo centralizado de rutas, importado en Sidebar y Login
- **CRUD Group completo**:
  - Modelo `Group` (id, nombre, categoria, nivel, autor, miembros, tickets)
  - `GroupService` con signals reactivos (create, update, remove)
  - Tabla PrimeNG con paginacion y ordenamiento por columna
  - Dialogo de creacion y edicion con validacion
  - ConfirmDialog para eliminar con mensaje de confirmacion
  - Toast de exito/error en cada operacion
  - Stat cards con totales de grupos, miembros y tickets
- **RUD User**: Toast al cargar la pagina con info de sesion activa o advertencia si no hay usuario
- **Login**: notificaciones via Toast de PrimeNG en lugar de mensajes inline
  - Toast de bienvenida al iniciar sesion exitosamente
  - Toast de error con mensaje especifico al fallar autenticacion
- **@angular/animations** instalado y registrado con `provideAnimationsAsync()`

---

## Principios aplicados

- Solo componentes de PrimeNG para la UI (Table, Dialog, Toast, ConfirmDialog, Tag, Button, Select...)
- Signals de Angular para estado reactivo en servicios
- CSS minimo: solo para layout o colores especificos que PrimeNG no cubre
- Lazy loading en todas las rutas
- Archivo centralizado de rutas (`app.paths.ts`) para evitar strings duplicados

---

### Practica 5 — Tickets, Dashboard, Kanban y Gestión de Miembros

Implementación completa del módulo de tickets, dashboard estadístico y vista Kanban/Lista con gestión de miembros.

#### Nuevos Modelos
- `ticket.model.ts`: `TicketStatus`, `TicketPriority`, `TicketComment`, `TicketHistoryEntry`, `Ticket`
- `group.model.ts`: extendido con `GroupMember` y `memberList: GroupMember[]`

#### Nuevos Servicios
- `ticket.service.ts`: CRUD con signals, 8 mocks, computed `statsCount` y `ticketsByStatus`
  - **Validación de negocio**: `update()` verifica que el nuevo `assignedTo` pertenezca al `memberList` del grupo del ticket via `GroupService.isMemberOfGroup()`
- `group.service.ts`: extendido con `addMember()`, `removeMember()`, `getMembersByGroupId()`, `isMemberOfGroup()`, y mocks con `memberList` real

#### Nuevas Páginas (ng generate)
```bash
ng generate component pages/tickets --standalone --skip-tests
```

#### Páginas modificadas
- **Dashboard** (`/home`): 4 stat cards reactivas, `p-chart` doughnut de tickets por status, tabla de 5 tickets más recientes, `p-skeleton` loading, `p-toast` bienvenida
- **Tickets** (`/home/tickets`): `p-table` con filtros de status/prioridad, búsqueda global, exportación CSV, `p-breadcrumb`, detail dialog con `p-timeline` de historial, form dialog con `p-select` filtrado por miembros del grupo
- **Grupos** (`/home/group`): click-to-select grupo, `p-selectButton` toggle Kanban/Lista, CdkDragDrop entre columnas de status, `p-panel` colapsable de miembros con añadir por email y eliminar
- **Sidebar**: 4 nav items (Dashboard, Tickets, Grupos, Usuario), búsqueda global inline que filtra `filteredNavItems()`

#### Fix de Overflow
- `src/styles.css`: clase global `.cell-truncate` (text-overflow: ellipsis)
- Aplicada en todas las celdas de texto largo en tablas y cards kanban

#### Dependencia agregada
```bash
npm install chart.js --save --legacy-peer-deps
```

---

#### Actualización de Estructura

```
src/app/
├── models/
│   ├── user.model.ts
│   ├── group.model.ts       ← GroupMember + memberList
│   └── ticket.model.ts      ← NUEVO
├── services/
│   ├── auth.service.ts
│   ├── group.service.ts     ← addMember, removeMember, isMemberOfGroup
│   └── ticket.service.ts   ← NUEVO (CRUD + validación por grupo)
├── pages/
│   ├── home/               ← Dashboard reescrito
│   └── tickets/            ← NUEVO módulo
├── group/                  ← Kanban/Lista/Miembros
└── components/
    └── sidebar/            ← Búsqueda global
```

#### Git Commits (Conventional Commits)

```bash
git add src/app/models/ticket.model.ts src/app/models/group.model.ts
git commit -m "feat(models): add Ticket model and extend Group with GroupMember"

git add src/app/services/ticket.service.ts src/app/services/group.service.ts
git commit -m "feat(services): add TicketService with business validation and extend GroupService with member CRUD"

git add src/app/pages/home/ src/app/pages/tickets/ src/app/app.routes.ts src/app/app.paths.ts
git commit -m "feat(pages): add Dashboard with p-chart and Tickets module with DynamicDialog"

git add src/app/group/ src/app/components/sidebar/ src/styles.css
git commit -m "feat(group): add Kanban/List toggle with CdkDragDrop, member management, and global overflow fix"

git add README.md package.json package-lock.json
git commit -m "docs: update README with Practica 5 changelog and install chart.js"

git push origin main
```

---

### Práctica 6 — Perfil, Usuarios (refactorización), Rediseño Modal Ticket y Clean Code

Refactorización arquitectural completa: nuevos componentes `Perfil` y `Usuarios`, rediseño UX del modal de tickets, lógica de cruce de datos y eliminación de código muerto.

#### Componentes generados / refactorizados

```bash
# Equivalente al siguiente ng generate (creados manualmente como standalone):
ng generate component components/perfil --standalone --skip-tests
ng generate component components/usuarios --standalone --skip-tests
```

#### Nueva arquitectura de Perfil (`components/perfil/`)

Muestra datos de la sesión activa usando mock data enriquecido:

| Sección          | Contenido                                               |
|------------------|---------------------------------------------------------|
| Identidad        | Avatar con iniciales, nombre, @username, rol con p-tag |
| Datos de contacto| Email, grupo asignado (cruzado de GroupService), nivel  |
| Ajustes          | Listado de configuraciones (Notificaciones, Tema, Idioma, 2FA) |
| Sesión actual    | Estado activo, tipo de cuenta, ID de usuario             |

**Componentes PrimeNG usados**: `p-card`, `p-divider`, `p-avatar`, `p-tag`, `p-button`, `p-breadcrumb`

**Lógica de cruce**: `userGroup` es un `computed()` que busca en `GroupService.groups()` el grupo al que pertenece el usuario logueado, usando `memberList.some(m => m.id === user.id)`.

#### Nueva arquitectura de Usuarios (`components/usuarios/`)

Sustituye al antiguo `user/` page. Muestra **todos los miembros de todos los grupos** en una sola `p-table`:

| Columna  | Fuente de datos                             |
|----------|---------------------------------------------|
| Nombre   | `GroupMember.name`                          |
| Grupo    | `Group.nombre` (cruzado por `memberList`)   |
| Rol      | `GroupMember.role` → p-tag con severidad    |
| Correo   | `GroupMember.email`                         |
| Estatus  | Hardcoded `'Activo'` (mock)                 |
| Acciones | Editar / Eliminar (toast informativo)        |

**Lógica de cruce**: El computed `usuarios()` itera `GroupService.groups()` y por cada grupo aplana `memberList` enriqueciendo cada fila con `grupoId` y `grupo`.

#### Rutas actualizadas (`app.paths.ts` / `app.routes.ts`)

```
/home/user      → ELIMINADA
/home/usuarios  → UsuariosPage (components/usuarios/)
/home/perfil    → Perfil       (components/perfil/)
```

#### Sidebar actualizado (`components/sidebar/`)

```typescript
{ label: 'Usuarios',   icon: 'pi pi-user',    route: APP_PATHS.usuarios },
{ label: 'Mi Perfil',  icon: 'pi pi-id-card', route: APP_PATHS.perfil   },
```

#### Rediseño UX del Modal de Tickets

El modal `p-dialog` de crear/editar tickets fue completamente rediseñado:

- **Validación en tiempo real**: flag `submitted` activa clases `ng-invalid` y `field-error` solo tras el primer intento de guardar
- **Mensajes de error inline**: `<small class="error-msg">` bajo campos inválidos
- **Layout en dos columnas** (`form-row`) para Estado/Prioridad y Fechas
- **Indicadores de campo obligatorio** (`*`) en rojo con `required-star`
- **Footer con contraste**: botón Guardar/Actualizar con `p-button` primario destacado, Cancelar con `severity="secondary" outlined`
- **Bloqueo de cierre** mientras se guarda: `[closable]="!isSaving()"`
- `cancelForm()` resetea `submitted` al cancelar

#### Clean Code aplicado

- ❌ Eliminados: todos los comentarios inline obvios del código TypeScript/HTML
- ❌ Eliminado: CSS muerto del componente `user/user.css`
- ✅ `submitted = false` se resetea en `openCreate()`, `openEdit()`, `cancelForm()` y al guardar exitosamente
- ✅ Todos los componentes nuevos son `standalone: true` sin dependencias circulares

#### Estructura actualizada

```
src/app/
├── app.paths.ts              ← usuarios + perfil (reemplaza user)
├── app.routes.ts             ← lazy routes actualizadas
├── components/
│   ├── perfil/               ← NUEVO (p-card, p-avatar, p-tag)
│   ├── usuarios/             ← NUEVO (p-table con cruce GroupService)
│   └── sidebar/              ← navItems actualizados
└── pages/
    └── tickets/
        ├── tickets.ts        ← submitted, cancelForm(), save() mejorado
        ├── tickets.html      ← modal rediseñado con validaciones
        └── tickets.css       ← estilos form-field, form-row, error-msg
```

#### Git Commits (Conventional Commits)

```bash
git add src/app/components/perfil/ src/app/components/usuarios/
git commit -m "feat: add Perfil and Usuarios standalone components with GroupService data binding"

git add src/app/app.paths.ts src/app/app.routes.ts src/app/components/sidebar/sidebar.ts
git commit -m "refactor: replace /user route with /usuarios and /perfil, update sidebar navItems"

git add src/app/pages/tickets/tickets.ts src/app/pages/tickets/tickets.html src/app/pages/tickets/tickets.css
git commit -m "feat: refactor user components and optimize ticket modal UX with real-time validation"

git add README.md
git commit -m "docs: update README with Practica 6 architecture - Perfil, Usuarios, ticket modal redesign"

git push origin main
```

---

### Práctica 7 — RBAC (Control de Acceso Basado en Roles) + Catálogo Global de Errores

Implementación de un sistema de permisos estructural con directivas Angular y un servicio centralizado de manejo de errores con toast automático.

#### Comandos de generación utilizados

```bash
# La directiva y el servicio fueron creados manualmente como standalone
# equivalentes a los siguientes comandos de CLI:
ng generate directive directives/hasRole --standalone --skip-tests
ng generate service services/permissionService --skip-tests
ng generate service services/errorHandlerService --skip-tests
```

#### Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `models/role.model.ts` | Union type `AppRole`, mapa de permisos por rol, función `hasPermission()` |
| `directives/has-role.directive.ts` | Directiva estructural `*hasRole` — elimina del DOM, no oculta |
| `services/permission.service.ts` | Servicio DI centralizado `can(permission)` y `hasRole(roles)` |
| `services/error-handler.service.ts` | Catálogo de errores + dispatch automático de toasts PrimeNG |

#### Sistema de Roles (RBAC)

| Rol     | Código   | Ver | Crear | Editar | Borrar |
|---------|----------|:---:|:-----:|:------:|:------:|
| ADMIN   | `admin`  | ✅  |  ✅   |   ✅   |   ✅   |
| MEDIUM  | `medium` | ✅  |  ✅   |   ✅   |   ❌   |
| BASE    | `user`   | ✅  |  ❌   |   ❌   |   ❌   |

#### Credenciales de prueba actualizadas

| Email            | Password        | Rol    |
|------------------|-----------------|--------|
| admin@erp.com    | Admin@Secure1   | ADMIN  |
| medium@erp.com   | Medium@Secure1  | MEDIUM |
| cesar@erp.com    | Cesar@Secure1   | BASE   |

#### Guía de uso de la directiva `*hasRole`

La directiva elimina el elemento del DOM si el usuario no tiene el rol requerido. No usa `display: none`.

```html
<!-- Acepta un rol único (string): -->
<ng-container *hasRole="'admin'">
  <p-button label="Eliminar" severity="danger" (onClick)="delete()" />
</ng-container>

<!-- Acepta un array de roles: -->
<ng-container *hasRole="['admin', 'medium']">
  <p-button label="Nuevo Ticket" icon="pi pi-plus" (onClick)="openCreate()" />
</ng-container>

<!-- Funciona sobre cualquier elemento o componente PrimeNG: -->
<p-splitButton *hasRole="'admin'" label="Acciones" [model]="adminItems" />
```

Para importarla en un componente standalone:

```typescript
import { HasRoleDirective } from '../../directives/has-role.directive';

@Component({
  imports: [HasRoleDirective, ...],
})
```

#### Catálogo de Errores (`ErrorHandlerService`)

```typescript
import { ErrorHandlerService, ERR } from '../../services/error-handler.service';

// Inyección
private readonly errorHandler = inject(ErrorHandlerService);

// Uso con código del catálogo:
this.errorHandler.dispatch(ERR.ERR_403_PERMISO);
this.errorHandler.dispatch(ERR.ERR_500_GENERIC, 'Mensaje personalizado');

// Atajos semánticos:
this.errorHandler.dispatchPermissionError();
this.errorHandler.dispatchSessionError();
```

| Código                | Severidad | Resumen               |
|-----------------------|-----------|-----------------------|
| `ERR_401_SESION`      | `warn`    | Sesión expirada       |
| `ERR_403_PERMISO`     | `error`   | Acceso denegado       |
| `ERR_404_RECURSO`     | `info`    | Recurso no encontrado |
| `ERR_409_CONFLICTO`   | `warn`    | Conflicto de datos    |
| `ERR_422_DATOS`       | `warn`    | Datos inválidos       |
| `ERR_500_GENERIC`     | `error`   | Error inesperado      |

#### `p-toast` global

Se registra en `app.ts` (componente raíz) y `MessageService` en `app.config.ts`.
Cualquier llamada a `ErrorHandlerService.dispatch()` aparece en toda la app sin configuración adicional por componente.

#### Arquitectura actualizada

```
src/app/
├── directives/
│   └── has-role.directive.ts    ← NUEVO (TemplateRef + ViewContainerRef)
├── models/
│   ├── role.model.ts            ← NUEVO (AppRole, Permission, hasPermission)
│   └── user.model.ts            ← role: AppRole (soporta 'medium')
├── services/
│   ├── permission.service.ts    ← NUEVO (can, hasRole)
│   └── error-handler.service.ts ← NUEVO (catálogo ERR_xxx + toast auto)
├── app.ts                       ← p-toast global
├── app.config.ts                ← MessageService proveído globalmente
├── pages/tickets/tickets.ts     ← PermissionService + ErrorHandlerService
├── group/group.ts               ← PermissionService + ErrorHandlerService
└── components/usuarios/usuarios.ts ← PermissionService + ErrorHandlerService
```

#### Git Commits

```bash
git add .
git commit -m "feat: implement RBAC directive and global error handling"
git push
```
