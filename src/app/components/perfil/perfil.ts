import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { GroupService } from '../../services/group.service';
import { TicketService } from '../../services/ticket.service';
import { TicketUtilsService } from '../../services/ticket-utils.service';
import { PermissionService } from '../../services/permission.service';
import { PRIMENG_MODULES } from '../../primeng';
import { Permission, PERMISSION_LABELS, PERMISSION_ICONS, ALL_PERMISSIONS } from '../../models/role.model';
import { TicketStatus, TicketPriority } from '../../models/ticket.model';

@Component({
    selector: 'app-perfil',
    standalone: true,
    imports: [CommonModule, ...PRIMENG_MODULES],
    templateUrl: './perfil.html',
    styleUrl: './perfil.css',
})
export class Perfil {
    private readonly authService = inject(AuthService);
    private readonly groupService = inject(GroupService);
    private readonly ticketService = inject(TicketService);
    readonly utils = inject(TicketUtilsService);
    readonly permissions = inject(PermissionService);

    readonly user = this.authService.currentUser;
    readonly allPermissions: Permission[] = ALL_PERMISSIONS;
    readonly permissionLabels = PERMISSION_LABELS;
    readonly permissionIcons = PERMISSION_ICONS;

    readonly userGroup = computed(() => {
        if (!this.user) return null;
        return this.groupService.groups().find(g =>
            g.memberList.some(m => m.id === this.user!.id)
        ) ?? null;
    });

    readonly initials = computed(() => {
        const name = this.user?.name ?? '';
        return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    });

    readonly roleSeverity = computed((): 'danger' | 'warn' | 'info' | 'success' | 'secondary' => {
        switch (this.user?.role) {
            case 'superAdmin': return 'danger';
            case 'admin':      return 'warn';
            case 'medium':     return 'info';
            default:           return 'secondary';
        }
    });

    readonly roleLabel = computed(() => {
        switch (this.user?.role) {
            case 'superAdmin': return 'Super Admin';
            case 'admin':      return 'Administrador';
            case 'medium':     return 'Editor';
            default:           return 'Basico';
        }
    });

    /** Tickets asignados al usuario actual */
    readonly myTickets = computed(() => {
        if (!this.user) return [];
        return this.ticketService.tickets().filter(
            t => t.assignedTo === this.user!.id || t.assignedName === this.user!.name
        );
    });

    /** Resumen de carga de trabajo */
    readonly myStats = computed(() => {
        const tickets = this.myTickets();
        return {
            abiertos:   tickets.filter(t => t.status === 'Pendiente').length,
            enProgreso: tickets.filter(t => t.status === 'En progreso').length,
            revision:   tickets.filter(t => t.status === 'Revisión').length,
            hechos:     tickets.filter(t => t.status === 'Finalizado').length,
            total:      tickets.length,
        };
    });

    /** Verifica si el usuario tiene un permiso especifico */
    hasPermission(permission: Permission): boolean {
        return this.user?.permissions?.includes(permission) ?? false;
    }

    statusSeverity(s: TicketStatus) { return this.utils.statusSeverity(s); }
    prioritySeverity(p: TicketPriority) { return this.utils.prioritySeverity(p); }

    readonly mockSettings = [
        { icon: 'pi pi-bell',   label: 'Notificaciones', value: 'Activadas' },
        { icon: 'pi pi-moon',   label: 'Tema',           value: 'Oscuro' },
        { icon: 'pi pi-globe',  label: 'Idioma',         value: 'Espanol' },
        { icon: 'pi pi-shield', label: '2FA',            value: 'Desactivado' },
    ];
}
