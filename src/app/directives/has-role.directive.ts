import {
  Directive, inject, Input, OnInit,
  TemplateRef, ViewContainerRef,
} from '@angular/core';
import { AppRole } from '../models/role.model';
import { PermissionService } from '../services/permission.service';

/**
 * Directiva estructural que muestra el contenido solo si el usuario
 * en sesion tiene el rol indicado.
 *
 * Uso: <div *hasRole="'admin'">...</div>
 *      <div *hasRole="['admin', 'medium']">...</div>
 */
@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective implements OnInit {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly permissionService = inject(PermissionService);

  @Input({ required: true }) hasRole!: AppRole | AppRole[];

  ngOnInit(): void {
    if (this.permissionService.hasRole(this.hasRole)) {
      this.vcr.createEmbeddedView(this.tpl);
    } else {
      this.vcr.clear();
    }
  }
}
