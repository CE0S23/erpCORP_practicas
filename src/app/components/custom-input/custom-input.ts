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
      <div class="input-field-container">
        <input
          pInputText
          [id]="inputId"
          [type]="effectiveType"
          [placeholder]="placeholder"
          [disabled]="isDisabled"
          [value]="value"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"
          (paste)="onPaste($event)"
          (blur)="onTouched()"
          class="custom-input-field"
          [class.has-toggle]="showPasswordToggle && type === 'password'"
          [class.custom-input-error]="hasError"
        />
        @if (showPasswordToggle && type === 'password') {
          <button
            type="button"
            class="pw-toggle-btn"
            (click)="togglePasswordVisibility()"
            [attr.aria-label]="passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            tabindex="-1"
          >
            @if (passwordVisible) {
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            }
          </button>
        }
      </div>
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
    .input-field-container {
      position: relative;
      width: 100%;
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
      box-sizing: border-box;
    }
    .custom-input-field.has-toggle {
      padding-right: 2.8rem;
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
    .pw-toggle-btn {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: color 0.2s ease;
    }
    .pw-toggle-btn:hover {
      color: #6366f1;
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
  @Input() showPasswordToggle = false;
  /** Bloquea la tecla Espacio en tiempo real */
  @Input() blockSpaces = false;
  /** Solo permite dígitos (0-9) */
  @Input() onlyDigits = false;

  @Output() valueChange = new EventEmitter<string>();

  value = '';
  isDisabled = false;
  passwordVisible = false;

  get effectiveType(): string {
    if (this.type === 'password' && this.passwordVisible) return 'text';
    return this.type;
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onChange: (value: string) => void = () => { };
  onTouched: () => void = () => { };

  /** Bloquea espacios y/o no-dígitos al presionar tecla */
  onKeydown(event: KeyboardEvent): void {
    if (this.blockSpaces && event.key === ' ') {
      event.preventDefault();
      return;
    }
    if (this.onlyDigits && event.key.length === 1 && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /** Filtra el texto pegado eliminando espacios y/o no-dígitos */
  onPaste(event: ClipboardEvent): void {
    if (!this.blockSpaces && !this.onlyDigits) return;
    event.preventDefault();
    let pasted = event.clipboardData?.getData('text') ?? '';
    if (this.onlyDigits) {
      pasted = pasted.replace(/\D/g, '');
    } else if (this.blockSpaces) {
      pasted = pasted.replace(/\s/g, '');
    }
    // Insertar el texto limpio en la posición actual
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const current = input.value;
    const newVal = current.slice(0, start) + pasted + current.slice(end);
    input.value = newVal;
    this.value = newVal;
    this.onChange(newVal);
    this.valueChange.emit(newVal);
  }

  onInput(event: Event): void {
    let val = (event.target as HTMLInputElement).value;
    // Limpieza reactiva en caso de input por composición (IME, etc.)
    if (this.onlyDigits) val = val.replace(/\D/g, '');
    else if (this.blockSpaces) val = val.replace(/\s/g, '');
    // Actualizar el input si el valor cambió por el filtro
    const input = event.target as HTMLInputElement;
    if (input.value !== val) input.value = val;
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
