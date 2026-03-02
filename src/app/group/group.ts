import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GroupService } from '../services/group.service';
import { Group, GroupLevel } from '../models/group.model';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-group',
  standalone: true,
  providers: [ConfirmationService, MessageService],
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ConfirmDialogModule,
    ToastModule,
    TagModule,
  ],
  templateUrl: './group.html',
  styleUrl: './group.css',
})
export class GroupPage {
  private readonly groupService = inject(GroupService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly groups = this.groupService.groups;
  readonly categories = this.groupService.categories;
  readonly levels = this.groupService.levels;

  readonly totalGroups = computed(() => this.groups().length);
  readonly totalMembers = computed(() => this.groups().reduce((acc, g) => acc + g.miembros, 0));
  readonly totalTickets = computed(() => this.groups().reduce((acc, g) => acc + g.tickets, 0));

  dialogVisible = false;
  editingId: string | null = null;

  draft: Omit<Group, 'id'> = this.emptyDraft();

  private emptyDraft(): Omit<Group, 'id'> {
    return {
      nombre: '',
      categoria: 'Desarrollo',
      nivel: 'Mid',
      autor: this.authService.currentUser?.name ?? 'Admin',
      miembros: 0,
      tickets: 0,
    };
  }

  openCreate(): void {
    this.draft = this.emptyDraft();
    this.editingId = null;
    this.dialogVisible = true;
  }

  openEdit(group: Group): void {
    this.draft = { nombre: group.nombre, categoria: group.categoria, nivel: group.nivel, autor: group.autor, miembros: group.miembros, tickets: group.tickets };
    this.editingId = group.id;
    this.dialogVisible = true;
  }

  save(): void {
    if (!this.draft.nombre.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Campo requerido', detail: 'El nombre del grupo es obligatorio.' });
      return;
    }
    if (this.editingId) {
      this.groupService.update(this.editingId, this.draft);
      this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: `Grupo "${this.draft.nombre}" actualizado.` });
    } else {
      this.groupService.create(this.draft);
      this.messageService.add({ severity: 'success', summary: 'Creado', detail: `Grupo "${this.draft.nombre}" creado.` });
    }
    this.dialogVisible = false;
  }

  confirmDelete(group: Group): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el grupo "${group.nombre}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.groupService.remove(group.id);
        this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `Grupo "${group.nombre}" eliminado.` });
      },
    });
  }

  levelSeverity(nivel: GroupLevel): 'success' | 'info' | 'warn' | 'danger' {
    return { Junior: 'info', Mid: 'success', Senior: 'warn', Lead: 'danger' }[nivel] as 'success' | 'info' | 'warn' | 'danger';
  }
}
