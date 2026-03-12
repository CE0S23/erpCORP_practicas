import { Injectable, inject, computed } from '@angular/core';
import { AuthService, SYSTEM_USERS } from './auth.service';
import { AppRole, Permission } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authService = inject(AuthService);

  /** Permisos efectivos del usuario en sesion (los de su perfil individual) */
  readonly currentPermissions = computed<Permission[]>(() => {
    const user = this.authService.currentUser;
    return user?.permissions ?? [];
  });

  readonly currentRole = computed<AppRole>(() => {
    return (this.authService.currentUser?.role ?? 'user') as AppRole;
  });

  /** Verifica si el usuario actual tiene un permiso especifico en su perfil */
  can(permission: Permission): boolean {
    if (!this.authService.currentUser?.enabled) return false;
    return this.currentPermissions().includes(permission);
  }

  /** Verifica si el usuario actual tiene uno de los roles indicados */
  hasRole(roles: AppRole | AppRole[]): boolean {
    const role = this.currentRole();
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(role);
  }

  /** Verifica si el usuario actual es superAdmin */
  get isSuperAdmin(): boolean {
    return this.currentRole() === 'superAdmin';
  }

  /** Verifica si el usuario actual es admin o superAdmin */
  get isAdmin(): boolean {
    return this.hasRole(['admin', 'superAdmin']);
  }

  /** Verifica si un usuario especifico tiene un permiso dado (para uso en vistas de gestion) */
  userCan(userId: string, permission: Permission): boolean {
    const user = SYSTEM_USERS().find(u => u.id === userId);
    return !!(user?.enabled && user?.permissions?.includes(permission));
  }
}
