import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { PanelModule } from 'primeng/panel';
import { TooltipModule } from 'primeng/tooltip';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { CdkDrag, CdkDropList, CdkDropListGroup, CdkDragPlaceholder, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GroupService } from '../services/group.service';
import { TicketService } from '../services/ticket.service';
import { TicketUtilsService } from '../services/ticket-utils.service';
import { AuthService } from '../services/auth.service';
import { ErrorHandlerService } from '../services/error-handler.service';
import { PermissionService } from '../services/permission.service';
import { HasRoleDirective } from '../directives/has-role.directive';
import { Group, GroupLevel, GroupMember } from '../models/group.model';
import { Ticket, TicketStatus, TicketPriority } from '../models/ticket.model';
import { APP_PATHS } from '../app.paths';

type ViewMode = 'kanban' | 'list';

@Component({
  selector: 'app-group',
  standalone: true,
  providers: [ConfirmationService, MessageService],
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, SelectModule, SelectButtonModule, ConfirmDialogModule,
    ToastModule, TagModule, PanelModule, TooltipModule, BreadcrumbModule,
    HasRoleDirective,
    CdkDrag, CdkDropList, CdkDropListGroup, CdkDragPlaceholder,
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
  newMemberEmail = '';

  readonly viewModeOptions = [
    { label: 'Kanban', value: 'kanban', icon: 'pi pi-th-large' },
    { label: 'Lista', value: 'list', icon: 'pi pi-list' },
  ];
  readonly kanbanStatuses: TicketStatus[] = ['Pendiente', 'En progreso', 'Revisión', 'Finalizado'];

  readonly ticketsByStatus = computed(() => {
    const grp = this.selectedGroup();
    if (!grp) return {} as Record<TicketStatus, Ticket[]>;
    return this.ticketService.getByGroupAndStatus(grp.id);
  });

  readonly groupTicketsList = computed(() => {
    const grp = this.selectedGroup();
    if (!grp) return [];
    return this.ticketService.getByGroup(grp.id);
  });

  readonly memberList = computed(() => this.selectedGroup()?.memberList ?? []);

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
      message: `¿Eliminar el grupo "${group.nombre}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.groupService.remove(group.id);
        if (this.selectedGroup()?.id === group.id) this.selectedGroup.set(null);
        this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `"${group.nombre}" eliminado.` });
      },
    });
  }

  dropTicket(event: CdkDragDrop<Ticket[]>, newStatus: TicketStatus): void {
    if (event.previousContainer === event.container) return;
    const ticket = event.item.data as Ticket;
    const user = this.authService.currentUser?.name ?? 'Sistema';
    this.ticketService.updateStatus(ticket.id, newStatus, user);
    this.messageService.add({ severity: 'success', summary: 'Estado actualizado', detail: `→ ${newStatus}`, life: 2000 });
  }

  addMember(): void {
    const grp = this.selectedGroup();
    const email = this.newMemberEmail.trim().toLowerCase();
    if (!grp || !email) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.messageService.add({ severity: 'warn', summary: 'Email inválido', detail: 'Ingresa un correo válido.', life: 3000 });
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
    this.messageService.add({ severity: 'success', summary: 'Miembro añadido', detail: `${email} añadido.`, life: 3000 });
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
