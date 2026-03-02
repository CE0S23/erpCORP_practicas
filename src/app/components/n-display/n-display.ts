import { Component, Input } from '@angular/core';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-n-display',
    standalone: true,
    imports: [TagModule],
    template: `
    <div class="n-display">
      <span class="n-label">N</span>
      <p-tag [value]="N.toString()" severity="info" />
    </div>
  `,
    styles: [`
    .n-display {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .n-label {
      font-size: 1rem;
      font-weight: 600;
      color: #9ca3af;
    }
  `],
})
export class NDisplay {
    @Input() N = 0;
}
