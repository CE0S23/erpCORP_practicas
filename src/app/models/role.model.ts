export type AppRole = 'superAdmin' | 'admin' | 'medium' | 'user';

export const APP_ROLES = {
  SUPERADMIN: 'superAdmin',
  ADMIN: 'admin',
  MEDIUM: 'medium',
  BASE: 'user',
} as const satisfies Record<string, AppRole>;

export type Permission = 'view' | 'create' | 'edit' | 'delete';

export const ALL_PERMISSIONS: Permission[] = ['view', 'create', 'edit', 'delete'];

/** Permisos base por rol — se usan como punto de partida,
 *  pero cada usuario puede tener permisos ajustados individualmente. */
export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, Permission[]> = {
  superAdmin: ['view', 'create', 'edit', 'delete'],
  admin:      ['view', 'create', 'edit', 'delete'],
  medium:     ['view', 'create', 'edit'],
  user:       ['view'],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_DEFAULT_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  view:   'Ver',
  create: 'Crear',
  edit:   'Editar',
  delete: 'Eliminar',
};

export const PERMISSION_ICONS: Record<Permission, string> = {
  view:   'pi pi-eye',
  create: 'pi pi-plus',
  edit:   'pi pi-pencil',
  delete: 'pi pi-trash',
};
