import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-advance-card',
  standalone: true,
  imports: [CardModule],
  template: `
    <p-card styleClass="advance-card-box">
      <h2>Advance</h2>
    </p-card>
  `,
  styles: [`
    :host ::ng-deep .advance-card-box {
      background: #1e1e3a !important;
      border: 1px solid rgba(99, 102, 241, 0.35) !important;
      border-radius: 14px;
      min-width: 260px;
    }
    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #818cf8;
      margin: 0;
    }
  `],
})
export class AdvanceCard { }
