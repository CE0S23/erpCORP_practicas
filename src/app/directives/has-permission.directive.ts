import {
  Directive, inject, Input, OnInit,
  TemplateRef, ViewContainerRef,
} from '@angular/core';
import { Permission } from '../models/role.model';
import { PermissionService } from '../services/permission.service';

/**
 * Directiva estructural que muestra el contenido solo si el usuario
 * en sesion tiene el permiso especificado en su perfil individual.
 *
 * Uso: <div *hasPermission="'edit'">...</div>
 *      <div *hasPermission="['edit', 'delete']">...</div>  (necesita al menos uno)
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly permissionService = inject(PermissionService);

  @Input({ required: true }) hasPermission!: Permission | Permission[];

  ngOnInit(): void {
    const required = Array.isArray(this.hasPermission)
      ? this.hasPermission
      : [this.hasPermission];

    const allowed = required.some(p => this.permissionService.can(p));

    if (allowed) {
      this.vcr.createEmbeddedView(this.tpl);
    } else {
      this.vcr.clear();
    }
  }
}
