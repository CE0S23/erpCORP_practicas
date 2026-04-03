export type AppRole = 'superAdmin' | 'admin' | 'medium' | 'user';

export const APP_ROLES = {
  SUPERADMIN: 'superAdmin',
  ADMIN: 'admin',
  MEDIUM: 'medium',
  BASE: 'user',
} as const satisfies Record<string, AppRole>;

/**
 * Permisos granulares por recurso.
 * Cada acción está ligada al recurso sobre el que se aplica.
 */
export enum AppPermission {
  // ── Tickets ─────────────────────────────────────────────────────
  VIEW_TICKETS   = 'view_tickets',
  CREATE_TICKETS = 'create_tickets',
  EDIT_TICKETS   = 'edit_tickets',
  DELETE_TICKETS = 'delete_tickets',

  // ── Grupos ──────────────────────────────────────────────────────
  VIEW_GROUPS    = 'view_groups',
  CREATE_GROUPS  = 'create_groups',
  EDIT_GROUPS    = 'edit_groups',
  DELETE_GROUPS  = 'delete_groups',

  // ── Usuarios (gestión de cuentas) ───────────────────────────────
  VIEW_USERS     = 'view_users',
  EDIT_USER      = 'edit_user',
  DELETE_USERS   = 'delete_users',
  CREATE_USERS   = 'create_users',
}

export type Permission = AppPermission;

export const ALL_PERMISSIONS: Permission[] = Object.values(AppPermission);

/** Subconjuntos temáticos — útil para la UI de gestión */
export const TICKET_PERMISSIONS: Permission[] = [
  AppPermission.VIEW_TICKETS,
  AppPermission.CREATE_TICKETS,
  AppPermission.EDIT_TICKETS,
  AppPermission.DELETE_TICKETS,
];

export const GROUP_PERMISSIONS: Permission[] = [
  AppPermission.VIEW_GROUPS,
  AppPermission.CREATE_GROUPS,
  AppPermission.EDIT_GROUPS,
  AppPermission.DELETE_GROUPS,
];

export const USER_PERMISSIONS: Permission[] = [
  AppPermission.VIEW_USERS,
  AppPermission.CREATE_USERS,
  AppPermission.EDIT_USER,
  AppPermission.DELETE_USERS,
];

/** Permisos base por rol */
export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, Permission[]> = {
  superAdmin: [...ALL_PERMISSIONS],
  admin: [
    AppPermission.VIEW_TICKETS, AppPermission.CREATE_TICKETS, AppPermission.EDIT_TICKETS, AppPermission.DELETE_TICKETS,
    AppPermission.VIEW_GROUPS,  AppPermission.CREATE_GROUPS,  AppPermission.EDIT_GROUPS,  AppPermission.DELETE_GROUPS,
    AppPermission.VIEW_USERS,   AppPermission.CREATE_USERS,   AppPermission.EDIT_USER,    AppPermission.DELETE_USERS,
  ],
  medium: [
    AppPermission.VIEW_TICKETS, AppPermission.CREATE_TICKETS, AppPermission.EDIT_TICKETS,
    AppPermission.VIEW_GROUPS,  AppPermission.CREATE_GROUPS,  AppPermission.EDIT_GROUPS,
  ],
  user: [
    AppPermission.VIEW_TICKETS,
    AppPermission.VIEW_GROUPS,
  ],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_DEFAULT_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  [AppPermission.VIEW_TICKETS]:   'Ver Tickets',
  [AppPermission.CREATE_TICKETS]: 'Crear Tickets',
  [AppPermission.EDIT_TICKETS]:   'Editar Tickets',
  [AppPermission.DELETE_TICKETS]: 'Eliminar Tickets',
  [AppPermission.VIEW_GROUPS]:    'Ver Grupos',
  [AppPermission.CREATE_GROUPS]:  'Crear Grupos',
  [AppPermission.EDIT_GROUPS]:    'Editar Grupos',
  [AppPermission.DELETE_GROUPS]:  'Eliminar Grupos',
  [AppPermission.VIEW_USERS]:     'Ver Usuarios',
  [AppPermission.CREATE_USERS]:   'Crear Usuarios',
  [AppPermission.EDIT_USER]:      'Editar Usuarios',
  [AppPermission.DELETE_USERS]:   'Eliminar Usuarios',
};

export const PERMISSION_ICONS: Record<Permission, string> = {
  [AppPermission.VIEW_TICKETS]:   'pi pi-eye',
  [AppPermission.CREATE_TICKETS]: 'pi pi-plus-circle',
  [AppPermission.EDIT_TICKETS]:   'pi pi-pencil',
  [AppPermission.DELETE_TICKETS]: 'pi pi-trash',
  [AppPermission.VIEW_GROUPS]:    'pi pi-eye',
  [AppPermission.CREATE_GROUPS]:  'pi pi-plus-circle',
  [AppPermission.EDIT_GROUPS]:    'pi pi-pencil',
  [AppPermission.DELETE_GROUPS]:  'pi pi-trash',
  [AppPermission.VIEW_USERS]:     'pi pi-users',
  [AppPermission.CREATE_USERS]:   'pi pi-user-plus',
  [AppPermission.EDIT_USER]:      'pi pi-user-edit',
  [AppPermission.DELETE_USERS]:   'pi pi-user-minus',
};

/** Grupos de permisos para la UI de gestión (agrupados por sección) */
export const PERMISSION_GROUPS: Array<{ label: string; icon: string; permissions: Permission[] }> = [
  { label: 'Tickets',  icon: 'pi pi-ticket', permissions: TICKET_PERMISSIONS },
  { label: 'Grupos',   icon: 'pi pi-users',  permissions: GROUP_PERMISSIONS  },
  { label: 'Usuarios', icon: 'pi pi-user',   permissions: USER_PERMISSIONS   },
];
