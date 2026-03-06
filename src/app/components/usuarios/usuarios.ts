import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { InputTextModule } from 'primeng/inputtext';
import { GroupService } from '../../services/group.service';
import { APP_PATHS } from '../../app.paths';

interface UsuarioRow {
    id: string;
    nombre: string;
    correo: string;
    rol: 'admin' | 'user';
    grupo: string;
    grupoId: string;
    estatus: 'Activo' | 'Inactivo';
}

@Component({
    selector: 'app-usuarios',
    standalone: true,
    providers: [MessageService],
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        TagModule,
        ButtonModule,
        ToastModule,
        TooltipModule,
        BreadcrumbModule,
        InputTextModule,
    ],
    templateUrl: './usuarios.html',
    styleUrl: './usuarios.css',
})
export class UsuariosPage {
    private readonly groupService = inject(GroupService);
    private readonly messageService = inject(MessageService);

    readonly paths = APP_PATHS;

    readonly breadcrumbItems = [
        { label: 'Dashboard', routerLink: this.paths.dashboard },
        { label: 'Usuarios' },
    ];
    readonly breadcrumbHome = { icon: 'pi pi-home', routerLink: this.paths.dashboard };

    readonly usuarios = computed<UsuarioRow[]>(() => {
        const rows: UsuarioRow[] = [];
        this.groupService.groups().forEach(grupo => {
            grupo.memberList.forEach(member => {
                rows.push({
                    id: member.id,
                    nombre: member.name,
                    correo: member.email,
                    rol: member.role,
                    grupo: grupo.nombre,
                    grupoId: grupo.id,
                    estatus: 'Activo',
                });
            });
        });
        return rows;
    });

    readonly totalUsuarios = computed(() => this.usuarios().length);

    readonly rolSeverity = (rol: 'admin' | 'user'): 'danger' | 'success' =>
        rol === 'admin' ? 'danger' : 'success';

    readonly rolLabel = (rol: 'admin' | 'user'): string =>
        rol === 'admin' ? 'Administrador' : 'Editor';

    notifyEdit(usuario: UsuarioRow): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Editar usuario',
            detail: `Función en desarrollo para: ${usuario.nombre}`,
            life: 3000,
        });
    }

    notifyDelete(usuario: UsuarioRow): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Eliminar usuario',
            detail: `Función en desarrollo para: ${usuario.nombre}`,
            life: 3000,
        });
    }
}
