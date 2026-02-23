import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-input',
  standalone: true,
  imports: [CommonModule, InputTextModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInput),
      multi: true,
    },
  ],
  template: `
    <div class="custom-input-wrapper">
      @if (label) {
        <label [for]="inputId" class="custom-input-label">{{ label }}</label>
      }
      <input
        pInputText
        [id]="inputId"
        [type]="type"
        [placeholder]="placeholder"
        [disabled]="isDisabled"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onTouched()"
        class="custom-input-field"
        [class.custom-input-error]="hasError"
      />
      @if (hasError && errorMessage) {
        <small class="custom-input-error-msg">{{ errorMessage }}</small>
      }
    </div>
  `,
  styles: [`
    .custom-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
    }
    .custom-input-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-color-secondary, #6b7280);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .custom-input-field {
      width: 100%;
      padding: 0.65rem 1rem;
      border-radius: 10px;
      border: 1.5px solid #e5e7eb;
      background: rgba(255,255,255,0.06);
      color: var(--text-color, #1f2937);
      font-size: 0.95rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .custom-input-field:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
    .custom-input-error {
      border-color: #ef4444 !important;
    }
    .custom-input-error-msg {
      font-size: 0.78rem;
      color: #ef4444;
      margin-top: 2px;
    }
  `],
})
export class CustomInput implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' = 'text';
  @Input() inputId = `input-${Math.random().toString(36).slice(2, 8)}`;
  @Input() hasError = false;
  @Input() errorMessage = '';

  @Output() valueChange = new EventEmitter<string>();

  value = '';
  isDisabled = false;

  onChange: (value: string) => void = () => { };
  onTouched: () => void = () => { };

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value = val;
    this.onChange(val);
    this.valueChange.emit(val);
  }

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
