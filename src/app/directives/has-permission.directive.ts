import {
  Directive, inject, Input, OnChanges, OnDestroy,
  TemplateRef, ViewContainerRef, OnInit
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Permission, AppPermission } from '../models/role.model';
import { PermissionService } from '../services/permission.service';

/**
 * Directiva estructural que muestra el contenido solo si el usuario
 * en sesión tiene el permiso especificado y cuenta con la jerarquía necesaria.
 * Reacciona dinámicamente tanto a los cambios de inputs (OnChanges)
 * como a los cambios del BehaviorSubject centralizado (rxJs).
 *
 * Uso: <div *hasPermission="'edit_user'">...</div>
 *      <div *appHasPermission="['edit_user', 'delete']">...</div>
 *      <button *appHasPermission="'edit_user'; targetUserRole: user.role; targetUserId: user.id">...</button>
 */
@Directive({
  // Mantenemos ambos alias para no romper código existente, a la vez que
  // proveemos la opción con el prefijo 'app' solicitado.
  selector: '[hasPermission], [appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnChanges, OnInit, OnDestroy {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly permissionService = inject(PermissionService);
  
  private destroy$ = new Subject<void>();

  @Input() hasPermission!: Permission | Permission[] | string | string[];
  @Input() appHasPermission!: Permission | Permission[] | string | string[];

  @Input() hasPermissionTargetUserRole?: string;
  @Input() appHasPermissionTargetUserRole?: string;

  @Input() hasPermissionTargetUserId?: string;
  @Input() appHasPermissionTargetUserId?: string;

  private hasView = false;

  ngOnInit(): void {
    // Suscripción al BehaviorSubject de permisos para reactividad
    this.permissionService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnChanges(): void {
    // Activa actualización inmediata si se modifican inputs (ej. la fila se actualiza)
    this.updateView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    // Tomamos la de appHasPermission si se usó ese nombre, o la tradicional.
    const permissionInput = this.hasPermission || this.appHasPermission;
    if (!permissionInput) return;

    const required = Array.isArray(permissionInput)
      ? permissionInput
      : [permissionInput];

    const allowed = required.some(p => 
      this.permissionService.canPerformAction(
        p as string, 
        this.appHasPermissionTargetUserRole || this.hasPermissionTargetUserRole, 
        this.appHasPermissionTargetUserId || this.hasPermissionTargetUserId
      )
    );

    // Renderizado eficiente: Solamente manipulamos el DOM cuando el
    // estado verdaderamente cambia (evita 'parpadeos').
    if (allowed && !this.hasView) {
      this.vcr.createEmbeddedView(this.tpl);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.vcr.clear();
      this.hasView = false;
    }
  }
}
