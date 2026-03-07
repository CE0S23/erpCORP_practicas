import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { AppRole, Permission, hasPermission } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authService = inject(AuthService);

  private get role(): AppRole {
    return (this.authService.currentUser?.role ?? 'user') as AppRole;
  }

  can(permission: Permission): boolean {
    return hasPermission(this.role, permission);
  }

  hasRole(roles: AppRole | AppRole[]): boolean {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(this.role);
  }
}
