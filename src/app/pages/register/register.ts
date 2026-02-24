import {
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CustomButton } from '../../components/custom-button/custom-button';
import { CustomInput } from '../../components/custom-input/custom-input';
import { CustomCard } from '../../components/custom-card/custom-card';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/user.model';

// ─── Validators personalizados ────────────────────────────────────────────────

/** Las contraseñas deben coincidir */
const passwordMatchValidator: ValidatorFn = (
  group: AbstractControl
): ValidationErrors | null => {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw === confirm ? null : { passwordMismatch: true };
};

/**
 * Contraseña fuerte:
 *  - Mínimo 10 caracteres
 *  - Al menos una mayúscula
 *  - Al menos un número
 *  - Al menos un símbolo especial: ! @ # $ % ^ & * ( ) _ + - = [ ] { } ; ' : " , . < > ? /
 */
const strongPasswordValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value: string = control.value ?? '';
  const errors: ValidationErrors = {};

  if (value.length < 10) errors['minlength'] = true;
  if (!/[A-Z]/.test(value)) errors['noUppercase'] = true;
  if (!/[0-9]/.test(value)) errors['noNumber'] = true;
  if (!/[!@#$%^&*()\-_=+\[\]{};':",./<>?]/.test(value)) errors['noSpecial'] = true;

  return Object.keys(errors).length ? errors : null;
};

/** Solo números (teléfono) */
const onlyNumbersValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value: string = control.value ?? '';
  return /^\d+$/.test(value) ? null : { onlyNumbers: true };
};

/** Edad >= 18 años */
const adultValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  if (!control.value) return null;
  const birth = new Date(control.value);
  const today = new Date();
  const age =
    today.getFullYear() -
    birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  return age >= 18 ? null : { underage: true };
};

// ─── Componente ───────────────────────────────────────────────────────────────
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CustomButton, CustomInput, CustomCard],
  template: `
    <div class="auth-page">
      <div class="auth-bg">
        <div class="bg-blob blob-1"></div>
        <div class="bg-blob blob-2"></div>
        <div class="bg-blob blob-3"></div>
      </div>

      <div class="auth-container">
        <a routerLink="/" class="auth-logo">
          <span>⚡</span> ERP<strong>Pro</strong>
        </a>

        <app-custom-card title="Crear cuenta" subtitle="Completa el formulario para registrarte" icon="🚀">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>

            <!-- ── Fila: usuario + nombre completo ── -->
            <div class="form-row">
              <div class="field-group">
                <app-custom-input
                  formControlName="username"
                  label="Usuario"
                  type="text"
                  placeholder="mi_usuario"
                  inputId="reg-username"
                  [hasError]="isInvalid('username')"
                  [errorMessage]="getError('username')"
                />
              </div>
              <div class="field-group">
                <app-custom-input
                  formControlName="name"
                  label="Nombre completo"
                  type="text"
                  placeholder="César Ramírez"
                  inputId="reg-name"
                  [hasError]="isInvalid('name')"
                  [errorMessage]="getError('name')"
                />
              </div>
            </div>

            <!-- ── Email ── -->
            <app-custom-input
              formControlName="email"
              label="Correo Electrónico"
              type="email"
              placeholder="tu@empresa.com"
              inputId="reg-email"
              [hasError]="isInvalid('email')"
              [errorMessage]="getError('email')"
            />

            <!-- ── Fila: contraseña + confirmar ── -->
            <div class="form-row">
              <div class="field-group">
                <app-custom-input
                  formControlName="password"
                  label="Contraseña"
                  type="password"
                  placeholder="Mín. 10 caracteres"
                  inputId="reg-password"
                  [hasError]="isInvalid('password')"
                  [errorMessage]="getError('password')"
                />
              </div>
              <div class="field-group">
                <app-custom-input
                  formControlName="confirmPassword"
                  label="Confirmar contraseña"
                  type="password"
                  placeholder="Repite tu contraseña"
                  inputId="reg-confirm"
                  [hasError]="isConfirmInvalid()"
                  errorMessage="Las contraseñas no coinciden"
                />
              </div>
            </div>

            <!-- Password strength bar -->
            @if (registerForm.get('password')?.value) {
              <div class="password-strength">
                <span class="strength-label">Fortaleza:</span>
                <div class="strength-bars">
                  @for (bar of strengthBars; track $index) {
                    <div class="strength-bar" [class]="bar"></div>
                  }
                </div>
                <span class="strength-text" [class]="strengthClass">{{ strengthLabel }}</span>
              </div>
              <div class="pw-rules">
                <span [class.rule-ok]="pwHas('length')"   [class.rule-err]="!pwHas('length')">
                  {{ pwHas('length') ? '✓' : '✗' }} Mínimo 10 caracteres
                </span>
                <span [class.rule-ok]="pwHas('upper')"    [class.rule-err]="!pwHas('upper')">
                  {{ pwHas('upper') ? '✓' : '✗' }} Una mayúscula
                </span>
                <span [class.rule-ok]="pwHas('number')"   [class.rule-err]="!pwHas('number')">
                  {{ pwHas('number') ? '✓' : '✗' }} Un número
                </span>
                <span [class.rule-ok]="pwHas('special')"  [class.rule-err]="!pwHas('special')">
                  {{ pwHas('special') ? '✓' : '✗' }} Un símbolo (!&#64;#$%^&amp;*)
                </span>
              </div>
            }

            <!-- ── Teléfono ── -->
            <app-custom-input
              formControlName="phone"
              label="Número de teléfono"
              type="text"
              placeholder="Solo números (ej. 5512345678)"
              inputId="reg-phone"
              [hasError]="isInvalid('phone')"
              [errorMessage]="getError('phone')"
            />

            <!-- ── Fecha de nacimiento ── -->
            <div class="field-group">
              <label class="native-label" for="reg-birthdate">
                Fecha de nacimiento
                <span class="label-note">(debes ser mayor de edad)</span>
              </label>
              <input
                id="reg-birthdate"
                type="date"
                formControlName="birthdate"
                class="native-date-input"
                [class.native-date-error]="isInvalid('birthdate')"
                [max]="maxDate"
              />
              @if (isInvalid('birthdate')) {
                <small class="field-error">{{ getError('birthdate') }}</small>
              }
            </div>

            <!-- ── Dirección ── -->
            <div class="field-group textarea-group">
              <label class="native-label" for="reg-address">Dirección</label>
              <textarea
                id="reg-address"
                formControlName="address"
                class="native-textarea"
                [class.native-date-error]="isInvalid('address')"
                placeholder="Calle, número, colonia, ciudad..."
                rows="2"
              ></textarea>
              @if (isInvalid('address')) {
                <small class="field-error">{{ getError('address') }}</small>
              }
            </div>

            <!-- ── Mensajes globales ── -->
            @if (errorMessage()) {
              <div class="auth-error"><span>⚠️</span> {{ errorMessage() }}</div>
            }
            @if (successMessage()) {
              <div class="auth-success"><span>✅</span> {{ successMessage() }}</div>
            }

            <!-- ── Botón: habilitado solo si el form es válido ── -->
            <app-custom-button
              label="Registrarme"
              icon="pi pi-user-plus"
              variant="primary"
              size="md"
              [fullWidth]="true"
              [loading]="isLoading()"
              [disabled]="registerForm.invalid && registerForm.touched"
            />

            @if (registerForm.invalid && registerForm.touched) {
              <p class="form-hint">⚠️ Completa correctamente todos los campos para continuar.</p>
            }
          </form>

          <div class="auth-footer">
            <p>¿Ya tienes cuenta? <a routerLink="/login" class="auth-link">Inicia sesión</a></p>
          </div>
        </app-custom-card>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    :host { display: block; }

    .auth-page {
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: #0a0a14;
      position: relative; overflow: hidden;
      padding: 2rem 0;
    }

    .auth-bg { position: absolute; inset: 0; pointer-events: none; }
    .bg-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4; }
    .blob-1 { width: 500px; height: 500px; bottom: -20%; right: -10%; background: radial-gradient(circle, #7c3aed, transparent); }
    .blob-2 { width: 400px; height: 400px; top: -15%; left: -10%; background: radial-gradient(circle, #0891b2, transparent); opacity: 0.3; }
    .blob-3 { width: 350px; height: 350px; top: 50%; left: 40%; background: radial-gradient(circle, #4f46e5, transparent); opacity: 0.2; }

    .auth-container {
      position: relative; z-index: 5;
      width: 100%; max-width: 620px;
      padding: 1.5rem;
      display: flex; flex-direction: column; align-items: center; gap: 1.5rem;
      animation: fade-slide-up 0.5s ease forwards;
    }
    @keyframes fade-slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .auth-logo {
      font-size: 1.6rem; font-weight: 300; color: #e5e7eb;
      text-decoration: none; letter-spacing: -0.02em;
      display: flex; align-items: center; gap: 0.4rem;
    }
    .auth-logo strong { font-weight: 800; color: #6366f1; }
    .auth-logo span { font-size: 1.8rem; }

    :host ::ng-deep .p-card {
      background: rgba(17, 17, 34, 0.85) !important;
      border: 1px solid rgba(99, 102, 241, 0.25) !important;
      backdrop-filter: blur(20px);
    }
    :host ::ng-deep .card-title { color: #f9fafb !important; }
    :host ::ng-deep .card-subtitle { color: #6b7280 !important; }
    :host ::ng-deep .custom-input-label { color: #9ca3af !important; }
    :host ::ng-deep .custom-input-field {
      background: rgba(255,255,255,0.05) !important;
      border-color: rgba(255,255,255,0.1) !important;
      color: #f9fafb !important;
    }
    :host ::ng-deep .custom-input-field::placeholder { color: #4b5563; }
    :host ::ng-deep .custom-input-field:focus {
      border-color: #6366f1 !important;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.2) !important;
      background: rgba(99,102,241,0.08) !important;
    }

    .auth-form { display: flex; flex-direction: column; gap: 1rem; }

    /* ─── Filas de 2 columnas ─── */
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
    @media (max-width: 520px) { .form-row { grid-template-columns: 1fr; } }

    .field-group { display: flex; flex-direction: column; gap: 5px; }

    /* ─── Labels nativos (fecha/textarea) ─── */
    .native-label {
      font-size: 0.85rem; font-weight: 600;
      color: #9ca3af; letter-spacing: 0.03em; text-transform: uppercase;
    }
    .label-note { font-size: 0.72rem; font-weight: 400; text-transform: none; color: #6b7280; }

    .native-date-input, .native-textarea {
      width: 100%; box-sizing: border-box;
      padding: 0.65rem 1rem; border-radius: 10px;
      border: 1.5px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #f9fafb; font-size: 0.95rem; font-family: 'Inter', sans-serif;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .native-date-input::-webkit-calendar-picker-indicator { filter: invert(1); }
    .native-date-input:focus, .native-textarea:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
      background: rgba(99,102,241,0.08);
    }
    .native-date-error { border-color: #ef4444 !important; }
    .native-textarea { resize: vertical; min-height: 64px; }

    .field-error { font-size: 0.78rem; color: #ef4444; margin-top: 2px; }

    /* ─── Password strength ─── */
    .password-strength {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0;
    }
    .strength-label { font-size: 0.78rem; color: #6b7280; white-space: nowrap; }
    .strength-bars { display: flex; gap: 4px; flex: 1; }
    .strength-bar {
      height: 4px; border-radius: 2px; flex: 1;
      background: rgba(255,255,255,0.1);
      transition: background 0.3s ease;
    }
    .strength-bar.active-weak   { background: #ef4444; }
    .strength-bar.active-fair   { background: #f59e0b; }
    .strength-bar.active-good   { background: #3b82f6; }
    .strength-bar.active-strong { background: #10b981; }
    .strength-text { font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .strength-text.weak   { color: #ef4444; }
    .strength-text.fair   { color: #f59e0b; }
    .strength-text.good   { color: #3b82f6; }
    .strength-text.strong { color: #10b981; }

    /* ─── Password rules checklist ─── */
    .pw-rules {
      display: flex; flex-wrap: wrap; gap: 0.35rem 0.75rem;
      padding: 0.5rem 0.75rem;
      background: rgba(255,255,255,0.03);
      border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);
    }
    .pw-rules span { font-size: 0.76rem; }
    .rule-ok  { color: #10b981; }
    .rule-err { color: #6b7280; }

    /* ─── Errores / éxito ─── */
    .auth-error, .auth-success {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.88rem;
    }
    .auth-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; }
    .auth-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; }

    .form-hint {
      text-align: center; font-size: 0.8rem;
      color: #f59e0b; margin: 0;
    }

    .auth-footer { margin-top: 1.25rem; text-align: center; }
    .auth-footer p { color: #6b7280; font-size: 0.88rem; }
    .auth-link { color: #818cf8; text-decoration: none; font-weight: 600; }
    .auth-link:hover { color: #a5b4fc; text-decoration: underline; }
  `],
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  /** Fecha máxima permitida = hoy (date input máximo) */
  readonly maxDate: string = (() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  })();

  readonly registerForm = this.fb.group(
    {
      username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^\S+$/)]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
      phone: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(15), onlyNumbersValidator]],
      birthdate: ['', [Validators.required, adultValidator]],
      address: ['', [Validators.required, Validators.minLength(10)]],
    },
    { validators: passwordMatchValidator }
  );

  // ─── Helpers de validación ────────────────────────────────────────────────

  isInvalid(field: string): boolean {
    const c = this.registerForm.get(field);
    return !!(c && c.invalid && c.touched);
  }

  isConfirmInvalid(): boolean {
    const c = this.registerForm.get('confirmPassword');
    return !!(c?.touched && this.registerForm.hasError('passwordMismatch'));
  }

  getError(field: string): string {
    const c = this.registerForm.get(field);
    if (!c || !c.errors || !c.touched) return '';

    const messages: Record<string, Record<string, string>> = {
      username: {
        required: 'El usuario es obligatorio',
        minlength: 'Mínimo 3 caracteres',
        pattern: 'Sin espacios',
      },
      name: {
        required: 'El nombre es obligatorio',
        minlength: 'Mínimo 3 caracteres',
      },
      email: {
        required: 'El correo es obligatorio',
        email: 'Correo no válido',
      },
      password: {
        required: 'La contraseña es obligatoria',
        minlength: 'Mínimo 10 caracteres',
        noUppercase: 'Falta una mayúscula',
        noNumber: 'Falta un número',
        noSpecial: 'Falta un símbolo (!@#$%^&*)',
      },
      phone: {
        required: 'El teléfono es obligatorio',
        minlength: 'Mínimo 7 dígitos',
        maxlength: 'Máximo 15 dígitos',
        onlyNumbers: 'Solo se permiten números',
      },
      birthdate: {
        required: 'La fecha de nacimiento es obligatoria',
        underage: 'Debes ser mayor de 18 años',
      },
      address: {
        required: 'La dirección es obligatoria',
        minlength: 'Dirección muy corta (mínimo 10 caracteres)',
      },
    };

    const fieldMessages = messages[field] ?? {};
    for (const key of Object.keys(c.errors)) {
      if (fieldMessages[key]) return fieldMessages[key];
    }
    return 'Campo inválido';
  }

  // ─── Password strength ────────────────────────────────────────────────────

  private get pw(): string {
    return this.registerForm.get('password')?.value ?? '';
  }

  /** Verifica cada regla de contraseña */
  pwHas(rule: 'length' | 'upper' | 'number' | 'special'): boolean {
    switch (rule) {
      case 'length': return this.pw.length >= 10;
      case 'upper': return /[A-Z]/.test(this.pw);
      case 'number': return /[0-9]/.test(this.pw);
      case 'special': return /[!@#$%^&*()\-_=+\[\]{};':",./<>?]/.test(this.pw);
    }
  }

  get passwordStrength(): number {
    let score = 0;
    if (this.pwHas('length')) score++;
    if (this.pwHas('upper')) score++;
    if (this.pwHas('number')) score++;
    if (this.pwHas('special')) score++;
    return score;
  }

  get strengthBars(): string[] {
    const strength = this.passwordStrength;
    const levels = ['weak', 'fair', 'good', 'strong'];
    const level = levels[strength - 1] ?? '';
    return Array.from({ length: 4 }, (_, i) =>
      i < strength ? `active-${level}` : ''
    );
  }

  get strengthLabel(): string {
    return ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][this.passwordStrength] ?? '';
  }

  get strengthClass(): string {
    return ['', 'weak', 'fair', 'good', 'strong'][this.passwordStrength] ?? '';
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const v = this.registerForm.value;
    const userData: RegisterRequest = {
      username: v.username!,
      name: v.name!,
      email: v.email!,
      password: v.password!,
      phone: v.phone!,
      birthdate: v.birthdate!,
      address: v.address!,
    };

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.successMessage.set(`¡Cuenta creada! Bienvenido, ${response.data?.name}.`);
          setTimeout(() => this.router.navigate(['/dashboard']), 1400);
        } else {
          this.errorMessage.set(response.message);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al crear la cuenta. Intenta nuevamente.');
      },
    });
  }
}
