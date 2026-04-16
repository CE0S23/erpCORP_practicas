import { Injectable, inject, computed, effect } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService, SYSTEM_USERS } from './auth.service';
import { AppRole, Permission } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authService = inject(AuthService);

  /** BehaviorSubject centralizado - permite suscripcion reactiva en directivas */
  private readonly permissionsSubject = new BehaviorSubject<Permission[]>([]);
  readonly permissions$ = this.permissionsSubject.asObservable();

  /** Compatibilidad con permisos legacy */
  private readonly permissionAliases: Record<string, string[]> = {
    view_tickets: ['view_tickets', 'manage_tickets'],
    create_tickets: ['create_tickets', 'manage_tickets'],
    edit_tickets: ['edit_tickets', 'manage_tickets'],
    delete_tickets: ['delete_tickets', 'manage_tickets'],
    view_groups: ['view_groups', 'manage_groups'],
    create_groups: ['create_groups', 'manage_groups'],
    edit_groups: ['edit_groups', 'manage_groups'],
    delete_groups: ['delete_groups', 'manage_groups'],
    view_users: ['view_users', 'manage_users'],
    create_users: ['create_users', 'manage_users'],
    edit_user: ['edit_user', 'manage_users'],
    delete_users: ['delete_users', 'manage_users'],
  };

  constructor() {
    // Sincronizamos el BehaviorSubject con el signal del AuthService.
    effect(() => {
      const user = this.authService.currentUser();
      this.permissionsSubject.next(user?.permissions || []);
    });
  }

  readonly currentRole = computed<AppRole>(() => {
    return (this.authService.currentUser()?.role ?? 'user') as AppRole;
  });

  private get isMasterEmail(): boolean {
    return (this.authService.currentUser()?.email ?? '').toLowerCase() === 'super@erp.com';
  }

  /** Verifica si el usuario actual tiene el permiso especifico */
  hasPermission(permission: string): boolean {
    if (!this.authService.currentUser()?.enabled) return false;
    if (this.isSuperAdmin || this.isMasterEmail) return true;

    const current = this.permissionsSubject.getValue();
    const accepted = this.permissionAliases[permission] ?? [permission];
    return accepted.some((perm: string) => current.includes(perm as Permission));
  }

  /** Alias de compatibilidad */
  can(permission: Permission): boolean {
    return this.hasPermission(permission);
  }

  /** Verifica si el usuario tiene uno de los roles indicados */
  hasRole(roles: AppRole | AppRole[]): boolean {
    const role = this.currentRole();
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(role);
  }

  get isSuperAdmin(): boolean {
    return this.currentRole() === 'superAdmin';
  }

  get isAdmin(): boolean {
    return this.hasRole(['admin', 'superAdmin']);
  }

  /** Jerarquia de roles: mayor numero = mas privilegios */
  getHierarchyLevel(role: AppRole | string): number {
    switch (role) {
      case 'superAdmin': return 4;
      case 'admin': return 3;
      case 'medium': return 2;
      case 'user': return 1;
      default: return 0;
    }
  }

  /**
   * Verifica permisos y jerarquia para una accion sobre un usuario objetivo.
   */
  canPerformAction(action: string, targetUserRole?: string, targetUserId?: string): boolean {
    if (this.isMasterEmail) return true;
    if (!this.hasPermission(action)) return false;

    if (targetUserId && this.authService.currentUser()?.id === targetUserId) {
      return false;
    }

    if (targetUserRole) {
      if (targetUserRole === 'superAdmin') return false;

      if (targetUserId) {
        const targetUser = SYSTEM_USERS().find((u) => u.id === targetUserId);
        if (targetUser?.email?.toLowerCase() === 'super@erp.com') return false;
      }
    }

    return true;
  }

  /** Verifica si un usuario especifico tiene un permiso dado */
  userCan(userId: string, permission: Permission): boolean {
    const user = SYSTEM_USERS().find((u) => u.id === userId);
    return !!(user?.enabled && user.permissions?.includes(permission));
  }
}

