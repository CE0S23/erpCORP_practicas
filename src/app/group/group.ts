import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CdkDrag, CdkDropList, CdkDropListGroup, CdkDragPlaceholder, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SelectButtonModule } from 'primeng/selectbutton';
import { GroupService } from '../services/group.service';
import { TicketService } from '../services/ticket.service';
import { TicketUtilsService } from '../services/ticket-utils.service';
import { AuthService, SYSTEM_USERS } from '../services/auth.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { PermissionService } from '../services/permission.service';
import { HasPermissionDirective } from '../directives/has-permission.directive';
import { Group, GroupLevel, GroupMember } from '../models/group.model';
import { Ticket, TicketStatus, TicketPriority } from '../models/ticket.model';
import { APP_PATHS } from '../app.paths';
import { PRIMENG_MODULES } from '../primeng';

type ViewMode    = 'kanban' | 'list';
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
export class GroupPage implements OnInit {
  private readonly groupService  = inject(GroupService);
  private readonly ticketService = inject(TicketService);
  private readonly authService   = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly errorHandler  = inject(ErrorHandlerService);
  readonly permissions = inject(PermissionService);
  readonly utils       = inject(TicketUtilsService);

  readonly groups  = this.groupService.groups;
  readonly levels  = this.groupService.levels;
  readonly paths   = APP_PATHS;

  /** Nombres de categorías para el dropdown del formulario */
  readonly categoryNames = computed(() =>
    this.groupService.categories().map(c => c.name)
  );

  readonly visibleGroups = computed(() => {
    const all  = this.groups();
    const user = this.authService.authState().user;
    if (!user) return [];
    if (['superAdmin', 'admin', 'medium'].includes(user.role)) return all;
    return all.filter(g => g.memberList.some(m => m.id === user.id));
  });

  readonly systemUsers = SYSTEM_USERS.asReadonly();

  readonly totalGroups  = computed(() => this.visibleGroups().length);
  readonly totalMembers = computed(() => this.visibleGroups().reduce((acc, g) => acc + g.miembros, 0));
  readonly totalTickets = computed(() => this.visibleGroups().reduce((acc, g) => acc + g.tickets, 0));

  readonly availableUserOptions = computed(() => {
    const members   = this.selectedGroup()?.memberList ?? [];
    const memberIds = new Set(members.map(m => m.id));
    return this.systemUsers()
      .filter(u => u.enabled && !memberIds.has(u.id))
      .map(u => ({ label: `${u.name} (${u.email})`, value: u.id }));
  });

  readonly isSaving       = signal(false);
  readonly isSavingTicket = signal(false);

  readonly breadcrumbItems = [
    { label: 'Dashboard', routerLink: this.paths.dashboard },
    { label: 'Grupos' },
  ];
  readonly breadcrumbHome = { icon: 'pi pi-home', routerLink: this.paths.dashboard };

  // ── Estado del CRUD de grupos ─────────────────────────────────────────────
  groupDialogVisible = false;
  editingId: string | null = null;
  groupSubmitted = false;
  ticketSubmitted = false;
  draft: Omit<Group, 'id'> = this.emptyDraft();

  // ── Estado del grupo seleccionado ─────────────────────────────────────────
  selectedGroup = signal<Group | null>(null);
  viewMode      = signal<ViewMode>('kanban');
  quickFilter   = signal<QuickFilter>('all');

  selectedNewMemberId = signal<string | null>(null);

  readonly viewModeOptions = [
    { label: 'Kanban', value: 'kanban', icon: 'pi pi-th-large' },
    { label: 'Lista',  value: 'list',   icon: 'pi pi-list'     },
  ];

  readonly quickFilterOptions: Array<{ label: string; value: QuickFilter; icon: string }> = [
    { label: 'Todos',          value: 'all',           icon: 'pi pi-list'                },
    { label: 'Mis tickets',    value: 'mine',          icon: 'pi pi-user'                },
    { label: 'Sin asignar',    value: 'unassigned',    icon: 'pi pi-inbox'               },
    { label: 'Alta prioridad', value: 'high-priority', icon: 'pi pi-exclamation-triangle' },
  ];

  readonly kanbanStatuses: TicketStatus[] = ['Pendiente', 'En progreso', 'Revisión', 'Finalizado'];
  readonly today = new Date();

  ticketDialogVisible = false;
  ticketDraft = this.emptyTicketDraft();

  readonly statusOptions   = this.ticketService.statuses.map(s => ({ label: s, value: s }));
  readonly priorityOptions = this.ticketService.priorities.map(p => ({ label: p, value: p }));

  readonly memberOptions = computed(() =>
    (this.selectedGroup()?.memberList ?? []).map(m => ({ label: m.name, value: m.id }))
  );

  readonly filteredGroupTickets = computed(() => {
    const grp = this.selectedGroup();
    if (!grp) return [];
    const tickets = this.ticketService.getByGroup(grp.id);
    const filter  = this.quickFilter();
    const me      = this.authService.currentUser()?.id ?? '';
    switch (filter) {
      case 'mine':          return tickets.filter(t => t.assignedTo === me);
      case 'unassigned':    return tickets.filter(t => !t.assignedTo);
      case 'high-priority': return tickets.filter(t =>
          t.priority === '高' || t.priority === '紧急' || t.priority === '严重');
      default:              return tickets;
    }
  });

  readonly ticketsByStatus = computed(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      Pendiente: [], 'En progreso': [], 'Revisión': [], Finalizado: [],
    };
    this.filteredGroupTickets().forEach(t => { if (map[t.status]) map[t.status].push(t); });
    return map;
  });

  readonly groupStats = computed(() => {
    const grp = this.selectedGroup();
    if (!grp) return null;
    const tickets = this.ticketService.getByGroup(grp.id);
    return {
      total:      tickets.length,
      pendiente:  tickets.filter(t => t.status === 'Pendiente').length,
      enProgreso: tickets.filter(t => t.status === 'En progreso').length,
      revision:   tickets.filter(t => t.status === 'Revisión').length,
      finalizado: tickets.filter(t => t.status === 'Finalizado').length,
    };
  });

  readonly memberList = computed(() => this.selectedGroup()?.memberList ?? []);

  get canDragTickets(): boolean {
    return this.permissions.hasPermission('edit_groups');
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.groupService.getGroups().subscribe();
    this.groupService.getCategories().subscribe();
    this.ticketService.getTickets().subscribe();
  }

  // ── Helpers visuales ──────────────────────────────────────────────────────

  statusSeverity(s: TicketStatus)    { return this.utils.statusSeverity(s);   }
  prioritySeverity(p: TicketPriority){ return this.utils.prioritySeverity(p); }
  priorityIcon(p: TicketPriority)    { return this.utils.priorityIcon(p);     }
  levelSeverity(nivel: GroupLevel)   { return this.utils.levelSeverity(nivel); }

  // ── Borradores vacíos ─────────────────────────────────────────────────────

  private emptyDraft(): Omit<Group, 'id'> {
    const user = this.authService.currentUser();
    const initialMembers: GroupMember[] = user ? [{
        id:       user.id,
        username: user.username,
        name:     user.name,
        email:    user.email,
        role:     ['superAdmin', 'admin'].includes(user.role) ? 'admin' : 'user',
    }] : [];
    return {
      nombre: '', categoria: '', categoriaId: undefined, nivel: 'Mid',
      autor: user?.name ?? 'Admin',
      miembros: initialMembers.length,
      tickets:  0,
      memberList: initialMembers,
    };
  }

  private emptyTicketDraft(): Omit<Ticket, 'id' | 'history' | 'comments'> {
    return {
      titulo: '', descripcion: '', status: 'Pendiente', priority: '中',
      assignedTo: '', assignedName: '',
      groupId: '', groupName: '',
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  // ── Selección de grupo ────────────────────────────────────────────────────

  selectGroup(group: Group): void {
    this.selectedGroup.set(group);
    this.viewMode.set('kanban');
    this.quickFilter.set('all');
  }

  // ── CRUD de grupos ────────────────────────────────────────────────────────

  openCreate(): void {
    if (!this.permissions.hasPermission('create_groups')) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    this.draft    = this.emptyDraft();
    this.editingId = null;
    this.groupSubmitted = false;
    this.groupDialogVisible = true;
  }

  openEdit(group: Group): void {
    if (!this.permissions.hasPermission('edit_groups')) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    this.groupSubmitted = false;
    this.draft = {
      nombre: group.nombre, categoria: group.categoria, categoriaId: group.categoriaId,
      nivel: group.nivel, autor: group.autor, miembros: group.miembros,
      tickets: group.tickets, memberList: [...group.memberList],
    };
    this.editingId = group.id;
    this.groupDialogVisible = true;
  }

  save(): void {
    this.groupSubmitted = true;
    if (!this.draft.nombre.trim()) {
      this.messageService.add({
        severity: 'warn', summary: 'Campo requerido',
        detail: 'El nombre del grupo es obligatorio.', life: 3000,
      });
      return;
    }
    if (this.isSaving()) return;
    this.isSaving.set(true);
    const nombre = this.draft.nombre;

    const op$ = this.editingId
      ? this.groupService.updateGroup(this.editingId, this.draft)
      : this.groupService.createGroup(this.draft);

    op$.subscribe({
      next: (saved) => {
        if (!this.editingId) {
          this.selectedGroup.set(saved);
          this.viewMode.set('kanban');
          this.quickFilter.set('all');
          this.messageService.add({
            severity: 'success', summary: 'Grupo creado',
            detail: `«${nombre}» creado.`, life: 4000,
          });
        } else {
          if (this.selectedGroup()?.id === this.editingId) {
            this.selectedGroup.set(saved);
          }
          this.messageService.add({
            severity: 'success', summary: 'Grupo actualizado',
            detail: `«${nombre}» actualizado.`, life: 3000,
          });
        }
        this.groupDialogVisible = false;
        this.isSaving.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error', summary: 'Error al guardar', detail: 'Intenta de nuevo.', life: 4000,
        });
        this.isSaving.set(false);
      },
    });
  }

  confirmDelete(group: Group): void {
    if (!this.permissions.hasPermission('delete_groups')) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    this.confirmationService.confirm({
      message: `Eliminar el grupo "${group.nombre}"? Esta accion no se puede deshacer.`,
      header:  'Confirmar eliminacion',
      icon:    'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.groupService.deleteGroup(group.id).subscribe({
          next: () => {
            if (this.selectedGroup()?.id === group.id) this.selectedGroup.set(null);
            this.messageService.add({
              severity: 'info', summary: 'Eliminado', detail: `"${group.nombre}" eliminado.`,
            });
          },
          error: () => this.messageService.add({
            severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el grupo.', life: 4000,
          }),
        });
      },
    });
  }

  // ── Ticket dentro del grupo ───────────────────────────────────────────────

  openCreateTicket(): void {
    if (!this.permissions.hasPermission('create_tickets')) {
      this.errorHandler.dispatchPermissionError();
      return;
    }
    const grp = this.selectedGroup();
    if (!grp) return;
    this.ticketSubmitted = false;
    this.ticketDraft = {
      ...this.emptyTicketDraft(),
      groupId:   grp.id,
      groupName: grp.nombre,
    };
    this.ticketDialogVisible = true;
  }

  onTicketMemberChange(): void {
    const member = this.selectedGroup()?.memberList.find(m => m.id === this.ticketDraft.assignedTo);
    this.ticketDraft.assignedName = member?.name ?? '';
  }

  saveTicket(): void {
    this.ticketSubmitted = true;
    if (!this.ticketDraft.titulo.trim()) {
      this.messageService.add({
        severity: 'warn', summary: 'Campo requerido',
        detail: 'El título del ticket es obligatorio.', life: 3000,
      });
      return;
    }
    if (this.isSavingTicket()) return;
    this.isSavingTicket.set(true);

    this.ticketService.createTicket({ ...this.ticketDraft }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success', summary: 'Ticket creado',
          detail: `«${this.ticketDraft.titulo}» agregado al grupo.`, life: 3000,
        });
        this.ticketDialogVisible = false;
        this.isSavingTicket.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Error desconocido';
        this.messageService.add({
          severity: 'error', summary: 'Error al crear ticket', detail: msg, life: 4000,
        });
        this.isSavingTicket.set(false);
      },
    });
  }

  // ── Kanban drag & drop ────────────────────────────────────────────────────

  dropTicket(event: CdkDragDrop<Ticket[]>, newStatus: TicketStatus): void {
    if (!this.canDragTickets) {
      this.messageService.add({
        severity: 'warn', summary: 'Sin permisos',
        detail: 'Necesitas permiso de edicion para mover tickets.', life: 3000,
      });
      return;
    }
    if (event.previousContainer === event.container) return;
    const ticket = event.item.data as Ticket;
    this.ticketService.updateStatus(ticket.id, newStatus, '').subscribe({
      next: () => this.messageService.add({
        severity: 'success', summary: 'Ticket movido', detail: `Estado → ${newStatus}`, life: 2000,
      }),
    });
  }

  // ── Gestión de miembros ───────────────────────────────────────────────────

  addMember(): void {
    const grp    = this.selectedGroup();
    const userId = this.selectedNewMemberId();
    if (!grp || !userId) {
      this.messageService.add({
        severity: 'warn', summary: 'Selecciona un usuario',
        detail: 'Elige un usuario de la lista para agregar al grupo.', life: 3000,
      });
      return;
    }

    if (grp.memberList.some(m => m.id === userId)) {
      this.messageService.add({
        severity: 'warn', summary: 'Ya es miembro',
        detail: 'Este usuario ya pertenece al grupo.', life: 3000,
      });
      return;
    }

    const sysUser = SYSTEM_USERS().find(u => u.id === userId);
    const role    = sysUser && ['superAdmin', 'admin'].includes(sysUser.role) ? 'admin' : 'member';

    this.groupService.addMember(grp.id, userId, role).subscribe({
      next: () => {
        const updated = this.groups().find(g => g.id === grp.id);
        if (updated) this.selectedGroup.set(updated);
        this.selectedNewMemberId.set(null);
        const name = sysUser?.name ?? userId;
        this.messageService.add({
          severity: 'success', summary: 'Miembro agregado', detail: `${name} agregado al grupo.`, life: 3000,
        });
      },
      error: () => this.messageService.add({
        severity: 'error', summary: 'Error', detail: 'No se pudo agregar el miembro.', life: 3000,
      }),
    });
  }

  removeMember(member: GroupMember): void {
    const grp = this.selectedGroup();
    if (!grp) return;
    this.groupService.removeMember(grp.id, member.id).subscribe({
      next: () => {
        const updated = this.groups().find(g => g.id === grp.id);
        if (updated) this.selectedGroup.set(updated);
        this.messageService.add({
          severity: 'info', summary: 'Miembro eliminado', detail: `${member.name} removido.`, life: 3000,
        });
      },
      error: () => this.messageService.add({
        severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el miembro.', life: 3000,
      }),
    });
  }
}
