import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TicketService } from '../../services/ticket.service';
import { TicketUtilsService } from '../../services/ticket-utils.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { PermissionService } from '../../services/permission.service';
import { HasRoleDirective } from '../../directives/has-role.directive';
import { Ticket, TicketStatus, TicketPriority } from '../../models/ticket.model';
import { GroupMember } from '../../models/group.model';
import { APP_PATHS } from '../../app.paths';
import { PRIMENG_MODULES } from '../../primeng';

@Component({
    selector: 'app-tickets',
    standalone: true,
    providers: [ConfirmationService, MessageService],
    imports: [
        CommonModule,
        FormsModule,
        HasRoleDirective,
        ...PRIMENG_MODULES,
    ],
    templateUrl: './tickets.html',
    styleUrl: './tickets.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsPage {
    private readonly ticketService = inject(TicketService);
    private readonly groupService = inject(GroupService);
    private readonly authService = inject(AuthService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly errorHandler = inject(ErrorHandlerService);
    readonly permissions = inject(PermissionService);
    readonly utils = inject(TicketUtilsService);

    readonly tickets = this.ticketService.tickets;
    readonly groups = this.groupService.groups;
    readonly paths = APP_PATHS;
    readonly isSaving = signal(false);

    readonly breadcrumbItems = [
        { label: 'Dashboard', routerLink: this.paths.dashboard },
        { label: 'Tickets' },
    ];
    readonly breadcrumbHome = { icon: 'pi pi-home', routerLink: this.paths.dashboard };

    detailVisible = false;
    selectedTicket: Ticket | null = null;

    formVisible = false;
    editingId: string | null = null;
    submitted = false;
    draft = this.emptyDraft();
    availableMembers: GroupMember[] = [];

    readonly statusOptions = this.ticketService.statuses.map(s => ({ label: s, value: s }));
    readonly priorityOptions = this.ticketService.priorities.map(p => ({ label: p, value: p }));

    readonly groupOptions = computed(() =>
        this.groups().map(g => ({ label: g.nombre, value: g.id }))
    );
    readonly memberOptions = computed(() =>
        this.availableMembers.map(m => ({ label: m.name, value: m.id }))
    );

    private emptyDraft(): Omit<Ticket, 'id' | 'history' | 'comments'> {
        return {
            titulo: '', descripcion: '', status: 'Pendiente', priority: 'Media',
            assignedTo: '', assignedName: '', groupId: '', groupName: '',
            createdAt: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
    }

    statusSeverity(s: TicketStatus) { return this.utils.statusSeverity(s); }
    prioritySeverity(p: TicketPriority) { return this.utils.prioritySeverity(p); }

    onGroupChange(): void {
        const group = this.groups().find(g => g.id === this.draft.groupId);
        this.draft.groupName = group?.nombre ?? '';
        this.draft.assignedTo = '';
        this.draft.assignedName = '';
        this.availableMembers = group?.memberList ?? [];
    }

    onMemberChange(): void {
        const member = this.availableMembers.find(m => m.id === this.draft.assignedTo);
        this.draft.assignedName = member?.name ?? '';
    }

    openDetail(ticket: Ticket): void {
        this.selectedTicket = ticket;
        this.detailVisible = true;
    }

    openCreate(): void {
        if (!this.permissions.can('create')) {
            this.errorHandler.dispatchPermissionError();
            return;
        }
        this.draft = this.emptyDraft();
        this.editingId = null;
        this.submitted = false;
        this.availableMembers = [];
        this.formVisible = true;
    }

    cancelForm(): void {
        this.submitted = false;
        this.formVisible = false;
    }

    openEdit(ticket: Ticket): void {
        if (!this.permissions.can('edit')) {
            this.errorHandler.dispatchPermissionError();
            return;
        }
        this.draft = {
            titulo: ticket.titulo, descripcion: ticket.descripcion, status: ticket.status,
            priority: ticket.priority, assignedTo: ticket.assignedTo, assignedName: ticket.assignedName,
            groupId: ticket.groupId, groupName: ticket.groupName,
            createdAt: ticket.createdAt, dueDate: ticket.dueDate,
        };
        this.editingId = ticket.id;
        this.submitted = false;
        const group = this.groups().find(g => g.id === ticket.groupId);
        this.availableMembers = group?.memberList ?? [];
        this.detailVisible = false;
        this.formVisible = true;
    }

    save(): void {
        this.submitted = true;
        if (!this.draft.titulo.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El título del ticket es obligatorio.', life: 3000 });
            return;
        }
        if (!this.draft.groupId) {
            this.messageService.add({ severity: 'warn', summary: 'Campo requerido', detail: 'Selecciona un grupo.', life: 3000 });
            return;
        }
        if (this.isSaving()) return;

        this.isSaving.set(true);
        const userName = this.authService.currentUser?.name ?? 'Sistema';

        try {
            if (this.editingId) {
                this.ticketService.update(this.editingId, { ...this.draft }, userName);
                this.messageService.add({ severity: 'success', summary: 'Ticket actualizado', detail: `«${this.draft.titulo}» actualizado.`, life: 3000 });
            } else {
                this.ticketService.create({ ...this.draft });
                this.messageService.add({ severity: 'success', summary: 'Ticket creado', detail: `«${this.draft.titulo}» creado.`, life: 3000 });
            }
            this.formVisible = false;
            this.submitted = false;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            this.errorHandler.dispatch('ERR_500_GENERIC', msg);
        } finally {
            this.isSaving.set(false);
        }
    }

    confirmDelete(ticket: Ticket): void {
        if (!this.permissions.can('delete')) {
            this.errorHandler.dispatchPermissionError();
            return;
        }
        this.confirmationService.confirm({
            message: `¿Eliminar "${ticket.titulo}"? Esta acción no se puede deshacer.`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Eliminar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.ticketService.remove(ticket.id);
                this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `"${ticket.titulo}" eliminado.`, life: 3000 });
            },
        });
    }
}
