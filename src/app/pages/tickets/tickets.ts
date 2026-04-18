import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDropList, CdkDropListGroup, CdkDragPlaceholder, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TicketService } from '../../services/ticket.service';
import { TicketUtilsService } from '../../services/ticket-utils.service';
import { GroupService } from '../../services/group.service';
import { AuthService, SYSTEM_USERS } from '../../services/auth.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { PermissionService } from '../../services/permission.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
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
        SelectButtonModule,
        HasPermissionDirective,
        CdkDrag, CdkDropList, CdkDropListGroup, CdkDragPlaceholder,
        ...PRIMENG_MODULES,
    ],
    templateUrl: './tickets.html',
    styleUrl: './tickets.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsPage implements OnInit {
    private static readonly UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    private readonly ticketService = inject(TicketService);
    private readonly groupService  = inject(GroupService);
    private readonly authService   = inject(AuthService);
    private readonly messageService      = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly errorHandler  = inject(ErrorHandlerService);
    readonly permissions = inject(PermissionService);
    readonly utils       = inject(TicketUtilsService);

    readonly tickets = this.ticketService.tickets;
    readonly groups  = this.groupService.groups;
    readonly paths   = APP_PATHS;
    readonly isSaving   = signal(false);
    readonly isLoading  = signal(true);
    readonly today      = new Date();

    readonly activeFilter = signal<'all' | 'mine' | 'unassigned' | 'high'>('all');

    // ── Vista Kanban / Lista ──────────────────────────────────────────────────
    readonly viewMode = signal<'list' | 'kanban'>('list');
    readonly viewModeOptions = [
        { label: 'Lista',  value: 'list',   icon: 'pi pi-list'    },
        { label: 'Kanban', value: 'kanban', icon: 'pi pi-th-large' },
    ];

    readonly kanbanStatuses: TicketStatus[] = ['Pendiente', 'En progreso', 'Revisión', 'Finalizado'];

    readonly ticketsByStatus = computed(() => {
        const map: Record<TicketStatus, Ticket[]> = {
            Pendiente: [], 'En progreso': [], 'Revisión': [], Finalizado: [],
        };
        this.filteredTickets().forEach(t => { if (map[t.status]) map[t.status].push(t); });
        return map;
    });

    readonly filteredTickets = computed(() => {
        const all    = this.tickets();
        const filter = this.activeFilter();
        const userId = this.authService.currentUser()?.id ?? '';
        switch (filter) {
            case 'mine':       return all.filter(t => t.assignedTo === userId);
            case 'unassigned': return all.filter(t => !t.assignedTo);
            case 'high':       return all.filter(t =>
                t.priority === 'Alta' || t.priority === 'Crítica');
            default:           return all;
        }
    });

    readonly breadcrumbItems = [
        { label: 'Dashboard', routerLink: this.paths.dashboard },
        { label: 'Tickets' },
    ];
    readonly breadcrumbHome = { icon: 'pi pi-home', routerLink: this.paths.dashboard };

    detailVisible = false;
    selectedTicket: Ticket | null = null;
    newComment = '';
    isSendingComment = signal(false);

    formVisible = false;
    editingId: string | null = null;
    submitted = false;
    draft = this.emptyDraft();
    /** Lista de miembros del grupo seleccionado — signal para que memberOptions sea reactivo */
    readonly availableMembers = signal<GroupMember[]>([]);

    readonly statusOptions   = this.ticketService.statuses.map(s => ({ label: s, value: s }));
    readonly priorityOptions = this.ticketService.priorities.map(p => ({ label: p, value: p }));

    readonly groupOptions = computed(() =>
        this.groups().map(g => ({ label: g.nombre, value: g.id }))
    );
    readonly memberOptions = computed(() => {
        const members  = this.availableMembers();
        const sysUsers = SYSTEM_USERS();
        return members.map(m => {
            // Enriquecer con datos de SYSTEM_USERS cuando estén disponibles (admin)
            const sys   = sysUsers.find(u => u.id === m.id);
            const label = sys?.name || m.name || m.email || m.id;
            return { label, value: m.id };
        });
    });

    private emptyDraft(): Omit<Ticket, 'id' | 'history' | 'comments'> {
        return {
            titulo: '', descripcion: '', status: 'Pendiente', priority: 'Media',
            assignedTo: '', assignedName: '', groupId: '', groupName: '',
            createdAt: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
    }

    private normalizeSelectValue(value: unknown): string {
        if (typeof value === 'string') return value.trim();
        if (value && typeof value === 'object') {
            const candidate = (value as { value?: unknown; id?: unknown }).value
                ?? (value as { value?: unknown; id?: unknown }).id;
            return typeof candidate === 'string' ? candidate.trim() : '';
        }
        return '';
    }

    private isUuid(value: string): boolean {
        return TicketsPage.UUID_REGEX.test(value);
    }

    statusSeverity(s: TicketStatus)   { return this.utils.statusSeverity(s);   }
    prioritySeverity(p: TicketPriority){ return this.utils.prioritySeverity(p); }

    // ── Kanban drag helpers ───────────────────────────────────────────────────

    get canDragTickets(): boolean {
        return this.permissions.hasPermission('edit_tickets');
    }

    canMoveTicket(ticket: Ticket): boolean {
        if (this.permissions.isAdmin) return true;
        const userId = this.authService.currentUser()?.id ?? '';
        return this.permissions.hasPermission('edit_tickets') && ticket.assignedTo === userId;
    }

    dropTicket(event: CdkDragDrop<Ticket[]>, newStatus: TicketStatus): void {
        const ticket = event.item.data as Ticket;
        if (!this.canMoveTicket(ticket)) {
            this.messageService.add({
                severity: 'warn', summary: 'Sin permisos',
                detail: 'Solo puedes mover tickets asignados a ti, o necesitas rol admin.', life: 3000,
            });
            return;
        }
        if (event.previousContainer === event.container) return;
        this.ticketService.updateStatus(ticket.id, newStatus, '').subscribe({
            next: () => this.messageService.add({
                severity: 'success', summary: 'Ticket movido',
                detail: `Estado → ${newStatus}`, life: 2000,
            }),
        });
    }

    ngOnInit(): void {
        this.ticketService.getTickets().subscribe({
            next:  () => this.isLoading.set(false),
            error: () => this.isLoading.set(false),
        });
        this.groupService.getGroups().subscribe();
    }

    onGroupChange(): void {
        this.draft.groupId    = this.normalizeSelectValue(this.draft.groupId);
        const group           = this.groups().find(g => g.id === this.draft.groupId);
        this.draft.groupName  = group?.nombre ?? '';
        this.draft.assignedTo = '';
        this.draft.assignedName = '';
        this._loadGroupMembers(this.draft.groupId);
        if (this.draft.groupId) {
            this.permissions.refreshPermissionsForGroup(this.draft.groupId);
        }
    }

    /** Carga miembros del grupo en availableMembers sin modificar asignación actual */
    private _loadGroupMembers(groupId: string): void {
        if (!groupId) {
            this.availableMembers.set([]);
            return;
        }

        const group        = this.groups().find(g => g.id === groupId);
        const localMembers = group?.memberList ?? [];

        // Usar memberList local si ya tiene nombres (evitar petición extra)
        if (localMembers.length > 0 && localMembers.some(m => m.name)) {
            this.availableMembers.set(localMembers);
            return;
        }

        // Obtener miembros desde la API y enriquecer con SYSTEM_USERS
        this.groupService.getMembers(groupId).subscribe({
            next: members => {
                const sysUsers = SYSTEM_USERS();
                const enriched = members.map(m => {
                    const sys = sysUsers.find(u => u.id === m.id);
                    return sys ? { ...m, name: sys.name, email: sys.email, username: sys.username } : m;
                });
                this.availableMembers.set(enriched.length > 0 ? enriched : localMembers);
            },
            error: () => {
                this.availableMembers.set(localMembers);
            },
        });
    }

    onMemberChange(): void {
        this.draft.assignedTo = this.normalizeSelectValue(this.draft.assignedTo);
        const member = this.availableMembers().find(m => m.id === this.draft.assignedTo);
        this.draft.assignedName = member?.name ?? '';
    }

    openDetail(ticket: Ticket): void {
        this.selectedTicket  = ticket;
        this.newComment      = '';
        this.detailVisible   = true;
    }

    sendComment(): void {
        const text = this.newComment.trim();
        if (!text || !this.selectedTicket) return;
        if (this.isSendingComment()) return;

        this.isSendingComment.set(true);
        const ticketId = this.selectedTicket.id;

        this.ticketService.addComment(ticketId, text).subscribe({
            next: () => {
                this.selectedTicket = this.ticketService.getById(ticketId) ?? this.selectedTicket;
                this.newComment = '';
                this.messageService.add({
                    severity: 'success', summary: 'Comentario agregado',
                    detail: 'Tu comentario fue publicado.', life: 2000,
                });
                this.isSendingComment.set(false);
            },
            error: () => {
                this.errorHandler.dispatch('ERR_500_GENERIC');
                this.isSendingComment.set(false);
            },
        });
    }

    openCreate(): void {
        if (!this.permissions.hasPermission('create_tickets')) {
            this.errorHandler.dispatchPermissionError();
            return;
        }
        this.draft           = this.emptyDraft();
        this.editingId       = null;
        this.submitted       = false;
        this.availableMembers.set([]);
        this.formVisible     = true;
    }

    cancelForm(): void {
        this.submitted   = false;
        this.formVisible = false;
    }

    openEdit(ticket: Ticket): void {
        if (!this.permissions.hasPermission('edit_tickets')) {
            this.errorHandler.dispatchPermissionError();
            return;
        }
        this.draft = {
            titulo: ticket.titulo, descripcion: ticket.descripcion, status: ticket.status,
            priority: ticket.priority, assignedTo: ticket.assignedTo, assignedName: ticket.assignedName,
            groupId: ticket.groupId, groupName: ticket.groupName,
            createdAt: ticket.createdAt, dueDate: ticket.dueDate,
        };
        this.editingId     = ticket.id;
        this.submitted     = false;
        this.detailVisible = false;
        this.formVisible   = true;
        // Cargar miembros del grupo sin resetear la asignación actual
        this._loadGroupMembers(ticket.groupId);
    }

    save(): void {
        this.submitted = true;
        this.draft.groupId = this.normalizeSelectValue(this.draft.groupId);
        this.draft.assignedTo = this.normalizeSelectValue(this.draft.assignedTo);
        if (!this.draft.titulo.trim()) {
            this.messageService.add({
                severity: 'warn', summary: 'Campo requerido',
                detail: 'El título del ticket es obligatorio.', life: 3000,
            });
            return;
        }
        if (!this.draft.groupId || !this.isUuid(this.draft.groupId)) {
            this.messageService.add({
                severity: 'warn', summary: 'Campo requerido',
                detail: 'Selecciona un grupo válido.', life: 3000,
            });
            return;
        }
        if (this.draft.assignedTo && !this.isUuid(this.draft.assignedTo)) {
            this.draft.assignedTo = '';
            this.draft.assignedName = '';
        }
        if (this.isSaving()) return;

        this.isSaving.set(true);

        const op$ = this.editingId
            ? this.ticketService.updateTicket(this.editingId, { ...this.draft })
            : this.ticketService.createTicket({ ...this.draft });

        op$.subscribe({
            next: () => {
                const label = this.editingId ? 'actualizado' : 'creado';
                this.messageService.add({
                    severity: 'success',
                    summary:  `Ticket ${label}`,
                    detail:   `«${this.draft.titulo}» ${label}.`,
                    life: 3000,
                });
                this.formVisible = false;
                this.submitted   = false;
                this.isSaving.set(false);
            },
            error: (err) => {
                const msg = err?.error?.message ?? err?.message ?? 'Error desconocido';
                this.errorHandler.dispatch('ERR_500_GENERIC', msg);
                this.isSaving.set(false);
            },
        });
    }

    confirmDelete(ticket: Ticket): void {
        if (!this.permissions.hasPermission('delete_tickets')) {
            this.errorHandler.dispatchPermissionError();
            return;
        }
        this.confirmationService.confirm({
            message: `¿Eliminar "${ticket.titulo}"? Esta acción no se puede deshacer.`,
            header:  'Confirmar eliminación',
            icon:    'pi pi-exclamation-triangle',
            acceptLabel: 'Eliminar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.ticketService.deleteTicket(ticket.id).subscribe({
                    next: () => this.messageService.add({
                        severity: 'info', summary: 'Eliminado',
                        detail: `"${ticket.titulo}" eliminado.`, life: 3000,
                    }),
                    error: () => this.messageService.add({
                        severity: 'error', summary: 'Error',
                        detail: 'No se pudo eliminar el ticket.', life: 4000,
                    }),
                });
            },
        });
    }
}
