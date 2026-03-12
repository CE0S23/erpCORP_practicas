# erpCORP — Sistema ERP de Gestion de Proyectos

> Proyecto academico de Seguridad Informatica, 8vo cuatrimestre.
> Frontend Angular 19 + PrimeNG 19 — sin backend real, datos hardcodeados.

---

## Tecnologias

| Libreria        | Version | Uso |
|----------------|---------|-----|
| Angular         | 19      | Framework principal (standalone components, signals) |
| PrimeNG         | 19      | Componentes UI (Table, Dialog, Toast, Kanban CDK…) |
| Angular CDK     | 19      | Drag & Drop para el tablero Kanban |
| Chart.js        | 4       | Graficas del Dashboard |

---

## Estructura del proyecto

```
src/app/
├── components/
│   ├── sidebar/          # Barra lateral con user-bar y chips de permisos
│   ├── perfil/           # Perfil del usuario: permisos, stats, tickets asignados
│   └── usuarios/         # CRUD de usuarios y gestion granular de permisos
├── directives/
│   ├── has-role.directive.ts       # *hasRole="['admin','superAdmin']"
│   └── has-permission.directive.ts # *hasPermission="'edit'"
├── group/                # Tablero Kanban + lista + gestion de grupo
├── models/
│   ├── role.model.ts     # AppRole, Permission, ROLE_DEFAULT_PERMISSIONS
│   ├── user.model.ts     # User con campo permissions[]
│   ├── ticket.model.ts   # Ticket con comments[] y history[]
│   └── group.model.ts    # Group y GroupMember
├── pages/
│   ├── home/             # Dashboard con graficas y tickets recientes
│   ├── login/            # Login + Registro
│   └── tickets/          # Vista de lista de tickets con filtros rapidos
└── services/
    ├── auth.service.ts         # SYSTEM_USERS global signal; CRUD de usuarios
    ├── permission.service.ts   # can(permission), hasRole(role), userCan(id, perm)
    ├── ticket.service.ts       # CRUD de tickets + addComment + updateStatus
    ├── ticket-utils.service.ts # Helpers de severidad/iconos de estado y prioridad
    ├── group.service.ts        # CRUD de grupos + addMember/removeMember
    └── error-handler.service.ts
```

---

## Vistas implementadas

### 1. Login / Registro
- Formulario con usuario + password.
- Validacion hardcodeada (sin backend).
- Manejo de errores con `p-toast`.

### 2. Dashboard (Home)
- Stat cards: Total, Pendientes, En Progreso, Finalizados.
- Mini-lista de tickets recientes.
- Grafica doughnut de distribucion por estado (Chart.js).

### 3. Tablero Kanban (dentro de Grupos)
- Columnas: Pendiente | En progreso | Revision | Finalizado.
- Drag & drop con Angular CDK — solo si el usuario tiene permiso `edit`.
- Filtros rapidos: Todos | Mis tickets | Sin asignar | Alta prioridad.
- Stats del grupo seleccionado (mini-dashboard por columna).

### 4. Detalle de Ticket
- Todos los campos: titulo, descripcion, estado, asignado, prioridad, fechas.
- Comentarios: ver y agregar (Ctrl+Enter para enviar).
- Historial de cambios con p-timeline.
- Boton "Editar" visible solo si usuario tiene permiso `edit`.

### 5. Lista de Tickets (modo tabla)
- Tabla paginada con filtros de columna (estado, prioridad).
- Filtros rapidos: Todos | Mis tickets | Sin asignar | Alta prioridad.
- Fechas limite vencidas marcadas en rojo.
- Exportar CSV.
- Botones de editar/eliminar controlados por permisos `edit`/`delete`.

### 6. Perfil de Usuario
- Datos del usuario: nombre, email, rol, grupo.
- **Permisos individuales** del usuario con estado activo/inactivo.
- **Stats de carga de trabajo**: tickets pendientes / en progreso / revision / finalizados.
- Tabla de tickets asignados al usuario.

### 7. Gestion de Grupo (con permisos)
- Lista de grupos en tabla + filtros.
- Tablero Kanban + Vista de lista dentro del grupo.
- Gestion de miembros (anadir por email, eliminar).
- Botones CRUD controlados por permisos `create`/`edit`/`delete`.

### 8. Crear/Editar Ticket
- Formulario completo: titulo, descripcion, estado, prioridad, grupo, asignado, fechas.
- Validacion con mensajes de error inline.

### 9. Filtros Rapidos
- Componente transversal en Kanban y Lista:
  - "Mis tickets" (asignados al usuario en sesion)
  - "Sin asignar"
  - "Alta prioridad" (Alta + Critica)

### 10. Gestion de Usuarios (superAdmin / admin)
- Tabla con todos los usuarios del sistema.
- Toggle de permisos individuales por usuario (view, create, edit, delete, manage).
- Habilitar/deshabilitar cuentas.
- Restablecer permisos al defecto del rol.
- CRUD completo (crear / eliminar — solo superAdmin puede eliminar).

---

## Sistema de Roles y Permisos

### Roles

| Rol        | Descripcion |
|-----------|-------------|
| superAdmin | Todos los permisos. Puede eliminar usuarios y acceder a todo. |
| admin      | Gestion de usuarios y permisos. No puede eliminar usuarios. |
| medium     | Puede crear y editar tickets/grupos. |
| user       | Solo lectura. |

### Permisos granulares

Cada usuario tiene un array `permissions[]` **independiente de su rol**, que puede ser ajustado por un admin/superAdmin.

| Permiso  | Label       | Controlado con |
|---------|-------------|----------------|
| `view`   | Ver         | Acceso a rutas |
| `create` | Crear       | Boton "Nuevo" en tickets y grupos |
| `edit`   | Editar      | Botones de edicion; drag & drop en Kanban |
| `delete` | Eliminar    | Botones de eliminacion |
| `manage` | Administrar | Gestion de usuarios |

### Directivas

```html
<!-- Solo aparece si el usuario tiene el permiso en su perfil -->
<ng-container *hasPermission="'edit'">
  <p-button label="Editar" />
</ng-container>

<!-- Solo aparece si el usuario tiene el rol indicado -->
<ng-container *hasRole="['admin','superAdmin']">
  <p-button label="Solo admins" />
</ng-container>
```

---

## Usuarios de prueba

| Usuario      | Password  | Rol        | Permisos por defecto |
|-------------|-----------|-----------|----------------------|
| superadmin  | super123  | superAdmin | view, create, edit, delete, manage |
| admin       | admin123  | admin      | view, create, edit, delete, manage |
| editor      | editor123 | medium     | view, create, edit |
| user        | user123   | user       | view |

---

## Instrucciones de uso

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev
# o
ng serve

# Build produccion
ng build
```

---

## Notas del proyecto

- **Sin backend ni base de datos**: todos los datos se almacenan en signals de Angular en memoria. Al recargar la pagina, se resetean los datos de prueba.
- **Permisos individuales**: cada usuario puede tener un set de permisos diferente al default de su rol. El superAdmin/admin puede modificarlos desde la vista de Gestion de Usuarios.
- **Drag & Drop Kanban**: el movimiento de tarjetas entre columnas solo esta habilitado si el usuario tiene el permiso `edit` en su perfil.
- **Comentarios e historial**: cada cambio de estado o actualizacion de campo en un ticket se registra en el historial. Los comentarios se pueden agregar desde el detalle del ticket.

---

*Proyecto para la materia de Seguridad Informatica — Ing. en Informatica, CETYS Universidad.*
