import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService, SYSTEM_USERS } from '../../services/auth.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { PermissionService } from '../../services/permission.service';
import { HasRoleDirective } from '../../directives/has-role.directive';
import { APP_PATHS } from '../../app.paths';
import { PRIMENG_MODULES } from '../../primeng';
import { User } from '../../models/user.model';
import {
  AppRole, Permission, ALL_PERMISSIONS,
  PERMISSION_LABELS, PERMISSION_ICONS,
  ROLE_DEFAULT_PERMISSIONS,
} from '../../models/role.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  imports: [
    CommonModule,
    FormsModule,
    HasRoleDirective,
    ...PRIMENG_MODULES,
  ],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class UsuariosPage {
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly permissions = inject(PermissionService);

  readonly paths = APP_PATHS;
  readonly allPermissions: Permission[] = ALL_PERMISSIONS;
  readonly permissionLabels = PERMISSION_LABELS;
  readonly permissionIcons = PERMISSION_ICONS;

  readonly breadcrumbItems = [
    { label: 'Dashboard', routerLink: this.paths.dashboard },
    { label: 'Usuarios' },
  ];
  readonly breadcrumbHome = { icon: 'pi pi-home', routerLink: this.paths.dashboard };

  /** Lista reactiva de usuarios del sistema */
  readonly usuarios = computed(() => SYSTEM_USERS());

  readonly totalActive = computed(() => this.usuarios().filter(u => u.enabled).length);
  readonly totalInactive = computed(() => this.usuarios().filter(u => !u.enabled).length);

  /** Dialog de creacion de usuario */
  dialogVisible = signal(false);
  isSaving = signal(false);
  draft = this.emptyDraft();

  readonly roleOptions: Array<{ label: string; value: AppRole }> = [
    { label: 'Super Admin', value: 'superAdmin' },
    { label: 'Administrador', value: 'admin' },
    { label: 'Editor', value: 'medium' },
    { label: 'Basico', value: 'user' },
  ];

  private emptyDraft(): Omit<User, 'id' | 'permissions' | 'enabled'> & { password: string } {
    return { username: '', name: '', email: '', role: 'user', password: '' };
  }

  // ─── Helpers de estilo ─────────────────────────────────────────────────────

  roleSeverity(role: AppRole): 'danger' | 'warn' | 'info' | 'success' | 'secondary' {
    switch (role) {
      case 'superAdmin': return 'danger';
      case 'admin':      return 'warn';
      case 'medium':     return 'info';
      default:           return 'secondary';
    }
  }

  roleLabel(role: AppRole): string {
    switch (role) {
      case 'superAdmin': return 'Super Admin';
      case 'admin':      return 'Admin';
      case 'medium':     return 'Editor';
      default:           return 'Basico';
    }
  }

  hasPermissionFor(user: User, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  /** El usuario actual puede gestionar usuarios */
  get canManage(): boolean {
    return this.permissions.hasRole(['superAdmin', 'admin']);
  }

  // ─── Gestion de permisos individuales ──────────────────────────────────────

  togglePermission(user: User, permission: Permission): void {
    if (!this.canManage) {
      this.errorHandler.dispatchPermissionError();
      return;
    }

    const current = [...user.permissions];
    const idx = current.indexOf(permission);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(permission);
    }

    this.authService.updateUserPermissions(user.id, current);
    this.messageService.add({
      severity: 'success',
      summary: 'Permiso actualizado',
      detail: `${PERMISSION_LABELS[permission]} ${idx > -1 ? 'removido' : 'otorgado'} a ${user.name}.`,
      life: 2500,
    });
  }

  resetToRoleDefaults(user: User): void {
    if (!this.canManage) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    const defaults = [...ROLE_DEFAULT_PERMISSIONS[user.role]];
    this.authService.updateUserPermissions(user.id, defaults);
    this.messageService.add({
      severity: 'info',
      summary: 'Permisos restablecidos',
      detail: `Permisos de ${user.name} reestablecidos al rol ${this.roleLabel(user.role)}.`,
      life: 3000,
    });
  }

  // ─── Habilitar / Deshabilitar ───────────────────────────────────────────────

  toggleEnabled(user: User): void {
    if (!this.canManage) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    if (user.id === this.authService.currentUser?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Accion no permitida',
        detail: 'No puedes deshabilitar tu propia cuenta.',
        life: 3000,
      });
      return;
    }
    this.authService.toggleUserEnabled(user.id);
    const action = user.enabled ? 'deshabilitada' : 'habilitada';
    this.messageService.add({
      severity: user.enabled ? 'warn' : 'success',
      summary: `Cuenta ${action}`,
      detail: `La cuenta de ${user.name} fue ${action}.`,
      life: 3000,
    });
  }

  // ─── Crear usuario ──────────────────────────────────────────────────────────

  openCreate(): void {
    if (!this.canManage) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    this.draft = this.emptyDraft();
    this.dialogVisible.set(true);
  }

  saveUser(): void {
    if (!this.draft.username.trim() || !this.draft.email.trim() || !this.draft.name.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Nombre, usuario y correo son obligatorios.',
        life: 3000,
      });
      return;
    }
    if (this.isSaving()) return;
    this.isSaving.set(true);

    this.authService.createUser({
      username: this.draft.username,
      name: this.draft.name,
      email: this.draft.email,
      role: this.draft.role,
    }).subscribe(res => {
      if (res.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Usuario creado',
          detail: `${res.data?.name} fue agregado al sistema.`,
          life: 3000,
        });
        this.dialogVisible.set(false);
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al crear',
          detail: res.message,
          life: 4000,
        });
      }
      this.isSaving.set(false);
    });
  }

  // ─── Eliminar usuario ───────────────────────────────────────────────────────

  confirmDelete(user: User): void {
    if (!this.permissions.hasRole('superAdmin')) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    if (user.id === this.authService.currentUser?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Accion no permitida',
        detail: 'No puedes eliminar tu propia cuenta.',
        life: 3000,
      });
      return;
    }
    this.confirmationService.confirm({
      message: `Eliminar al usuario "${user.name}" de forma permanente?`,
      header: 'Confirmar eliminacion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.authService.deleteUser(user.id);
        this.messageService.add({
          severity: 'info',
          summary: 'Usuario eliminado',
          detail: `${user.name} fue eliminado del sistema.`,
          life: 3000,
        });
      },
    });
  }
}
