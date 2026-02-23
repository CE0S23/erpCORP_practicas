import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-custom-card',
    standalone: true,
    imports: [CommonModule, CardModule],
    template: `
    <p-card [styleClass]="cardClass">
      @if (title) {
        <ng-template pTemplate="header">
          <div class="card-header">
            @if (icon) {
              <span class="card-icon">{{ icon }}</span>
            }
            <div>
              <h2 class="card-title">{{ title }}</h2>
              @if (subtitle) {
                <p class="card-subtitle">{{ subtitle }}</p>
              }
            </div>
          </div>
        </ng-template>
      }
      <ng-content />
    </p-card>
  `,
    styles: [`
    :host ::ng-deep .p-card {
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.6);
      overflow: hidden;
    }
    :host ::ng-deep .p-card-body {
      padding: 2rem;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem 2rem 0;
    }
    .card-icon {
      font-size: 2rem;
      line-height: 1;
    }
    .card-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
    }
    .card-subtitle {
      font-size: 0.88rem;
      color: #6b7280;
      margin: 4px 0 0;
    }
    :host.elevated ::ng-deep .p-card {
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }
  `],
})
export class CustomCard {
    @Input() title = '';
    @Input() subtitle = '';
    @Input() icon = '';
    @Input() elevated = false;

    get cardClass(): string {
        return this.elevated ? 'elevated' : '';
    }
}
