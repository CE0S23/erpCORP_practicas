import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ButtonModule, ButtonSeverity } from 'primeng/button';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-custom-button',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <p-button
      [label]="label"
      [icon]="icon"
      [loading]="loading"
      [disabled]="disabled || loading"
      [severity]="severity"
      [outlined]="outlined"
      [rounded]="rounded"
      [styleClass]="computedClass"
      (onClick)="handleClick($event)"
    />
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    :host ::ng-deep .p-button {
      font-weight: 600;
      letter-spacing: 0.02em;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    :host ::ng-deep .p-button:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    :host ::ng-deep .p-button:active {
      transform: translateY(0);
    }
    :host ::ng-deep .p-button.size-sm {
      padding: 0.4rem 1rem;
      font-size: 0.85rem;
    }
    :host ::ng-deep .p-button.size-md {
      padding: 0.65rem 1.5rem;
      font-size: 0.95rem;
    }
    :host ::ng-deep .p-button.size-lg {
      padding: 0.85rem 2rem;
      font-size: 1.05rem;
    }
    :host ::ng-deep .full-width.p-button {
      width: 100%;
      justify-content: center;
    }
  `],
})
export class CustomButton {
  @Input() label = '';
  @Input() icon = '';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() fullWidth = false;
  @Input() rounded = false;
  @Input() outlined = false;

  @Output() clicked = new EventEmitter<MouseEvent>();

  get severity(): ButtonSeverity {
    const map: Record<ButtonVariant, ButtonSeverity> = {
      primary: 'primary',
      secondary: 'secondary',
      danger: 'danger',
      ghost: 'help',
    };
    return map[this.variant];
  }

  get computedClass(): string {
    const classes: string[] = [`size-${this.size}`];
    if (this.fullWidth) classes.push('full-width');
    return classes.join(' ');
  }

  handleClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
}
