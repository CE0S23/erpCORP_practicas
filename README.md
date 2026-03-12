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

### 1. Login / Selección de Grupo
- Formulario con correo y contraseña.
- Navegación estricta usando enrutamiento de Angular.
- Al ingresar con éxito, el flujo va a `Lista de grupos` donde es posible escoger el espacio de trabajo.

### 2. Dashboard del Grupo
- Resumen exacto de la carga del grupo actual.
- Oculto a la vista, se encuentra mapeado el requerimiento: `Modelo LLM` asimilado en el color hexadecimal de fondo para una integración fluida en la app.

### 3. Tablero Kanban de Tickets
- Columnas: Pendiente | En progreso | Revisión | Finalizado.
- Drag & drop activo usando **Angular CDK**.
- Tarjetas mostradas detallando el encargado, prioridad visible y control de movimiento restringido a permisos.

### 4. Detalle de Ticket
- Despliegue de ticket usando un `p-dialog` nativo sin salirse de la UI.
- Comentarios y seguimiento. Historial automatizado de qué usuario alteró cada campo.
- **7 Niveles de Severidad Chinos** mapeados y funcionales: `极低`, `低`, `常规`, `中`, `高`, `紧急` y `严重`.

### 5. Lista de Tickets (modo tabla)
- Tablas PrimeNG (`p-table`) con filtro global de texto, iteración por tags y modo de exportación estructurado a CSV.

### 6. Perfil de Usuario
- Estadísticas del usuario activo y visualización condensada de permisos en sesión.
- Lista y carga de trabajo de los tickets vinculados a éste.

### 7. Gestión de Grupo (Admin)
- Control de configuración colaborativa.
- Añadir a los usuarios mediante sus emails y expulsión restringida por permisos `delete`.
- Vista segmentada por grupos "Alpha", "Design", etc.

### 8. Crear Ticket
- Modal centralizado inter operable en casi cualquier vista o Dashboard global.
- Catálogo de `Status` y asignaciones.

### 9. Filtros Rápidos (Módulo Genérico)
- Chips interactivos transversales al Kanban y Tabla General con filtros duros precargados:
  - "Mis tickets"
  - "Sin asignar"
  - "Alta prioridad" (Mapea estrictamente a los strings `高`, `紧急` y `严重`).

### 10. Gestión de Usuarios (superAdmin)
- Una matriz jerárquica y con interruptores unitarios para los switches CRUD (Ver, Crear, Editar, Eliminar y Administrar) delegando los derechos de manera purista en **Signals**.
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

*Proyecto para la materia de Seguridad Informatica — Ing. en Informatica.
