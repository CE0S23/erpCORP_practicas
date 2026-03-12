import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDropList, CdkDropListGroup, CdkDragPlaceholder, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectButtonModule } from 'primeng/selectbutton';
import { GroupService } from '../services/group.service';
import { TicketService } from '../services/ticket.service';
import { TicketUtilsService } from '../services/ticket-utils.service';
import { AuthService } from '../services/auth.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { PermissionService } from '../services/permission.service';
import { HasRoleDirective } from '../directives/has-role.directive';
import { HasPermissionDirective } from '../directives/has-permission.directive';
import { Group, GroupLevel, GroupMember } from '../models/group.model';
import { Ticket, TicketStatus, TicketPriority } from '../models/ticket.model';
import { APP_PATHS } from '../app.paths';
import { PRIMENG_MODULES } from '../primeng';

type ViewMode = 'kanban' | 'list';
type QuickFilter = 'all' | 'mine' | 'unassigned' | 'high-priority';

@Component({
  selector: 'app-group',
  standalone: true,
  providers: [ConfirmationService, MessageService],
  imports: [
    CommonModule, FormsModule, SelectButtonModule,
    HasPermissionDirective,
    CdkDrag, CdkDropList, CdkDropListGroup, CdkDragPlaceholder,
    ...PRIMENG_MODULES,
  ],
  templateUrl: './group.html',
  styleUrl: './group.css',
})
export class GroupPage {
  private readonly groupService = inject(GroupService);
  private readonly ticketService = inject(TicketService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly errorHandler = inject(ErrorHandlerService);
  readonly permissions = inject(PermissionService);
  readonly utils = inject(TicketUtilsService);

  readonly groups = this.groupService.groups;
  readonly categories = this.groupService.categories;
  readonly levels = this.groupService.levels;
  readonly paths = APP_PATHS;

  readonly totalGroups = computed(() => this.groups().length);
  readonly totalMembers = computed(() => this.groups().reduce((acc, g) => acc + g.miembros, 0));
  readonly totalTickets = computed(() => this.groups().reduce((acc, g) => acc + g.tickets, 0));

  readonly isSaving = signal(false);

  readonly breadcrumbItems = [
    { label: 'Dashboard', routerLink: this.paths.dashboard },
    { label: 'Grupos' },
  ];
  readonly breadcrumbHome = { icon: 'pi pi-home', routerLink: this.paths.dashboard };

  dialogVisible = false;
  editingId: string | null = null;
  draft: Omit<Group, 'id'> = this.emptyDraft();

  selectedGroup = signal<Group | null>(null);
  viewMode = signal<ViewMode>('kanban');
  quickFilter = signal<QuickFilter>('all');
  newMemberEmail = '';

  readonly viewModeOptions = [
    { label: 'Kanban', value: 'kanban', icon: 'pi pi-th-large' },
    { label: 'Lista', value: 'list', icon: 'pi pi-list' },
  ];

  readonly quickFilterOptions: Array<{ label: string; value: QuickFilter; icon: string }> = [
    { label: 'Todos', value: 'all', icon: 'pi pi-list' },
    { label: 'Mis tickets', value: 'mine', icon: 'pi pi-user' },
    { label: 'Sin asignar', value: 'unassigned', icon: 'pi pi-inbox' },
    { label: 'Alta prioridad', value: 'high-priority', icon: 'pi pi-exclamation-triangle' },
  ];

  readonly kanbanStatuses: TicketStatus[] = ['Pendiente', 'En progreso', 'Revisión', 'Finalizado'];
  readonly today = new Date();

  /** Tickets del grupo filtrados por filtro rapido */
  readonly filteredGroupTickets = computed(() => {
    const grp = this.selectedGroup();
    if (!grp) return [];
    const tickets = this.ticketService.getByGroup(grp.id);
    const filter = this.quickFilter();
    const currentUser = this.authService.currentUser?.name ?? '';

    switch (filter) {
      case 'mine':
        return tickets.filter(t => t.assignedName === currentUser);
      case 'unassigned':
        return tickets.filter(t => !t.assignedTo);
      case 'high-priority':
        return tickets.filter(t => t.priority === '高' || t.priority === '紧急' || t.priority === '严重');
      default:
        return tickets;
    }
  });

  /** Tickets por estado (aplicando filtro rapido) */
  readonly ticketsByStatus = computed(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      Pendiente: [], 'En progreso': [], 'Revisión': [], Finalizado: [],
    };
    this.filteredGroupTickets().forEach(t => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  });

  /** Stats del grupo seleccionado */
  readonly groupStats = computed(() => {
    const grp = this.selectedGroup();
    if (!grp) return null;
    const tickets = this.ticketService.getByGroup(grp.id);
    return {
      total: tickets.length,
      pendiente: tickets.filter(t => t.status === 'Pendiente').length,
      enProgreso: tickets.filter(t => t.status === 'En progreso').length,
      revision: tickets.filter(t => t.status === 'Revisión').length,
      finalizado: tickets.filter(t => t.status === 'Finalizado').length,
    };
  });

  readonly memberList = computed(() => this.selectedGroup()?.memberList ?? []);

  /** El usuario puede arrastrar tickets (requiere permiso 'edit') */
  get canDragTickets(): boolean {
    return this.permissions.can('edit');
  }

  private emptyDraft(): Omit<Group, 'id'> {
    return {
      nombre: '', categoria: 'Desarrollo', nivel: 'Mid',
      autor: this.authService.currentUser?.name ?? 'Admin',
      miembros: 0, tickets: 0, memberList: [],
    };
  }

  statusSeverity(s: TicketStatus) { return this.utils.statusSeverity(s); }
  prioritySeverity(p: TicketPriority) { return this.utils.prioritySeverity(p); }
  priorityIcon(p: TicketPriority) { return this.utils.priorityIcon(p); }
  levelSeverity(nivel: GroupLevel) { return this.utils.levelSeverity(nivel); }

  selectGroup(group: Group): void {
    this.selectedGroup.set(group);
    this.viewMode.set('kanban');
    this.quickFilter.set('all');
  }

  openCreate(): void {
    if (!this.permissions.can('create')) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    this.draft = this.emptyDraft();
    this.editingId = null;
    this.dialogVisible = true;
  }

  openEdit(group: Group): void {
    if (!this.permissions.can('edit')) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    this.draft = {
      nombre: group.nombre, categoria: group.categoria, nivel: group.nivel,
      autor: group.autor, miembros: group.miembros, tickets: group.tickets,
      memberList: [...group.memberList],
    };
    this.editingId = group.id;
    this.dialogVisible = true;
  }

  save(): void {
    if (!this.draft.nombre.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El nombre del grupo es obligatorio.', life: 3000 });
      return;
    }
    if (this.isSaving()) return;
    this.isSaving.set(true);
    const nombre = this.draft.nombre;

    try {
      if (this.editingId) {
        this.groupService.update(this.editingId, this.draft);
        this.messageService.add({ severity: 'success', summary: 'Grupo actualizado', detail: `«${nombre}» actualizado.`, life: 3000 });
      } else {
        this.groupService.create(this.draft);
        this.messageService.add({ severity: 'success', summary: 'Grupo creado', detail: `«${nombre}» agregado.`, life: 3000 });
      }
      this.dialogVisible = false;
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error al guardar', detail: 'Intenta de nuevo.', life: 4000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(group: Group): void {
    if (!this.permissions.can('delete')) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    this.confirmationService.confirm({
      message: `Eliminar el grupo "${group.nombre}"? Esta accion no se puede deshacer.`,
      header: 'Confirmar eliminacion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.groupService.remove(group.id);
        if (this.selectedGroup()?.id === group.id) this.selectedGroup.set(null);
        this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `"${group.nombre}" eliminado.` });
      },
    });
  }

  dropTicket(event: CdkDragDrop<Ticket[]>, newStatus: TicketStatus): void {
    if (!this.canDragTickets) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Necesitas permiso de edicion para mover tickets.',
        life: 3000,
      });
      return;
    }
    if (event.previousContainer === event.container) return;
    const ticket = event.item.data as Ticket;
    const user = this.authService.currentUser?.name ?? 'Sistema';
    this.ticketService.updateStatus(ticket.id, newStatus, user);
    this.messageService.add({ severity: 'success', summary: 'Ticket movido', detail: `Estado → ${newStatus}`, life: 2000 });
  }

  addMember(): void {
    const grp = this.selectedGroup();
    const email = this.newMemberEmail.trim().toLowerCase();
    if (!grp || !email) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.messageService.add({ severity: 'warn', summary: 'Email invalido', detail: 'Ingresa un correo valido.', life: 3000 });
      return;
    }
    if (grp.memberList.some(m => m.email === email)) {
      this.messageService.add({ severity: 'warn', summary: 'Ya existe', detail: 'Este usuario ya es miembro.', life: 3000 });
      return;
    }

    const username = email.split('@')[0];
    this.groupService.addMember(grp.id, { username, name: username, email, role: 'user' });
    const updated = this.groups().find(g => g.id === grp.id);
    if (updated) this.selectedGroup.set(updated);
    this.newMemberEmail = '';
    this.messageService.add({ severity: 'success', summary: 'Miembro anadido', detail: `${email} anadido.`, life: 3000 });
  }

  removeMember(member: GroupMember): void {
    const grp = this.selectedGroup();
    if (!grp) return;
    this.groupService.removeMember(grp.id, member.id);
    const updated = this.groups().find(g => g.id === grp.id);
    if (updated) this.selectedGroup.set(updated);
    this.messageService.add({ severity: 'info', summary: 'Miembro eliminado', detail: `${member.name} removido.`, life: 3000 });
  }
}
