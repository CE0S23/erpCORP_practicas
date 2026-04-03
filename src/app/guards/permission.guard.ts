import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { AppPermission, AppRole } from '../models/role.model';
import { MessageService } from 'primeng/api';

/**
 * Guard de Navegación.
 * Soporta dos modos de protección según la configuración de la ruta:
 *  - `requiredPermission`: el usuario debe tener ese permiso en su array INDIVIDUAL.
 *  - `requiredRoles`: el usuario debe pertenecer a al menos uno de esos roles.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const permissionService = inject(PermissionService);
  const router            = inject(Router);
  const messageService    = inject(MessageService);

  // ── Validación por rol ─────────────────────────────────────────────────
  const requiredRoles = route.data?.['requiredRoles'] as AppRole[] | undefined;
  if (requiredRoles?.length) {
    if (permissionService.hasRole(requiredRoles)) return true;

    messageService.add({
      severity: 'error',
      summary:  'Acceso Denegado',
      detail:   'Solo administradores pueden acceder a esta sección.',
      life: 3500,
    });
    return router.createUrlTree(['/home/dashboard-all']);
  }

  // ── Validación por permiso individual ─────────────────────────────────────
  const requiredPermission = route.data?.['requiredPermission'] as AppPermission | string;
  if (requiredPermission) {
    if (permissionService.hasPermission(requiredPermission)) return true;

    messageService.add({
      severity: 'warn',
      summary:  'Sin acceso',
      detail:   'No tienes permiso para ver esta sección. Contacta a tu administrador.',
      life: 4000,
    });
    return router.createUrlTree(['/home/dashboard-all']);
  }

  return true;
};

