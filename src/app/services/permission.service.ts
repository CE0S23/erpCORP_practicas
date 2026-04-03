import { Injectable, inject, computed, effect } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService, SYSTEM_USERS } from './auth.service';
import { AppRole, Permission, AppPermission } from '../models/role.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authService = inject(AuthService);

  /** BehaviorSubject centralizado — permite suscripción reactiva en directivas */
  private readonly permissionsSubject = new BehaviorSubject<Permission[]>([]);
  readonly permissions$ = this.permissionsSubject.asObservable();

  constructor() {
    // Sincronizamos el BehaviorSubject con el signal del AuthService.
    effect(() => {
      const user = this.authService.currentUser(); // signal — registra dependencia
      if (user) {
        this.permissionsSubject.next(user.permissions || []);
      } else {
        this.permissionsSubject.next([]);
      }
    });
  }

  readonly currentRole = computed<AppRole>(() => {
    return (this.authService.currentUser()?.role ?? 'user') as AppRole;
  });

  /** Verifica si el usuario actual tiene el permiso específico */
  hasPermission(permission: string): boolean {
    if (!this.authService.currentUser()?.enabled) return false;
    return this.permissionsSubject.getValue().includes(permission as Permission);
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

  /** Jerarquía de roles: mayor número = más privilegios */
  getHierarchyLevel(role: AppRole | string): number {
    switch (role) {
      case 'superAdmin': return 4;
      case 'admin':      return 3;
      case 'medium':     return 2;
      case 'user':       return 1;
      default:           return 0;
    }
  }

  /**
   * Verifica permisos y jerarquía para una acción sobre un usuario objetivo.
   */
  canPerformAction(action: string, targetUserRole?: string, targetUserId?: string): boolean {
    if (!this.hasPermission(action)) return false;

    if (targetUserId && this.authService.currentUser()?.id === targetUserId) {
      return false;
    }

    if (targetUserRole) {
      if (targetUserRole === 'superAdmin') return false;

      const myLevel     = this.getHierarchyLevel(this.currentRole());
      const targetLevel = this.getHierarchyLevel(targetUserRole);
      if (myLevel <= targetLevel) return false;

      if (targetUserId) {
        const targetUser = SYSTEM_USERS().find(u => u.id === targetUserId);
        if (targetUser) {
          const myPerms       = this.permissionsSubject.getValue();
          const missingPerms  = targetUser.permissions.some(p => !myPerms.includes(p));
          if (missingPerms) return false;
        }
      }
    }

    return true;
  }

  /** Verifica si un usuario específico tiene un permiso dado */
  userCan(userId: string, permission: Permission): boolean {
    const user = SYSTEM_USERS().find(u => u.id === userId);
    return !!(user?.enabled && user?.permissions?.includes(permission));
  }
}
