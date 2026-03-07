import {
  Directive, inject, Input, OnInit,
  TemplateRef, ViewContainerRef,
} from '@angular/core';
import { AppRole } from '../models/role.model';
import { PermissionService } from '../services/permission.service';

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
