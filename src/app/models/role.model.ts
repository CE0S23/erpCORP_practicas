export type AppRole = 'admin' | 'medium' | 'user';

export const APP_ROLES = {
  ADMIN: 'admin',
  MEDIUM: 'medium',
  BASE: 'user',
} as const satisfies Record<string, AppRole>;

export type Permission = 'view' | 'create' | 'edit' | 'delete';

const ROLE_PERMISSION_MAP: Record<AppRole, Permission[]> = {
  admin:  ['view', 'create', 'edit', 'delete'],
  medium: ['view', 'create', 'edit'],
  user:   ['view'],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSION_MAP[role]?.includes(permission) ?? false;
}
