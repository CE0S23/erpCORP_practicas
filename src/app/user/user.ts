import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListboxModule } from 'primeng/listbox';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProfileCard } from '../components/profile-card/profile-card';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-user',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, ListboxModule, FormsModule, ToastModule, ProfileCard],
  templateUrl: './user.html',
  styleUrl: './user.css',
})
export class UserPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  users: User[] = [
    { id: '1', username: 'admin_erp', name: 'Admin ERP', email: 'admin@erp.com', role: 'admin' },
    { id: '2', username: 'cesar_ramirez', name: 'César Ramírez', email: 'cesar@erp.com', role: 'user' },
  ];

  selectedUser: User | null = this.authService.currentUser;

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (user) {
      this.messageService.add({
        severity: 'info',
        summary: 'Sesión activa',
        detail: `Has iniciado sesión como ${user.name} (${user.role})`,
        life: 3500,
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin sesión',
        detail: 'No hay ningún usuario autenticado actualmente.',
        life: 4000,
      });
    }
  }
}
