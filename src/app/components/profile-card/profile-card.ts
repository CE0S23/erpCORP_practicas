import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user.model';

@Component({
    selector: 'app-profile-card',
    standalone: true,
    imports: [CommonModule, CardModule, TagModule],
    template: `
    <p-card>
      <ng-template pTemplate="header">
        <div class="profile-header">
          <h2>Profile</h2>
        </div>
      </ng-template>

      @if (user) {
        <div class="profile-info">
          <div class="info-row">
            <span class="info-label">Nombre</span>
            <span class="info-value">{{ user.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Usuario</span>
            <span class="info-value">{{ user.username }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-value">{{ user.email }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Rol</span>
            <p-tag [value]="user.role" [severity]="user.role === 'admin' ? 'warn' : 'info'" />
          </div>
        </div>
      } @else {
        <p class="no-user">Selecciona un usuario</p>
      }
    </p-card>
  `,
    styles: [`
    .profile-header {
      padding: 1rem 1.25rem 0;
    }
    h2 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #6366f1;
      margin: 0;
    }
    .profile-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .info-label {
      font-size: 0.82rem;
      color: #9ca3af;
      font-weight: 600;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 0.9rem;
      color: #f9fafb;
    }
    .no-user {
      color: #6b7280;
      font-size: 0.9rem;
      text-align: center;
    }
  `],
})
export class ProfileCard {
    @Input() user: User | null = null;
}
