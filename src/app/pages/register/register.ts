import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CustomButton } from '../../components/custom-button/custom-button';
import { CustomInput } from '../../components/custom-input/custom-input';
import { CustomCard } from '../../components/custom-card/custom-card';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/user.model';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CustomButton, CustomInput, CustomCard],
  template: `
    <div class="auth-page">
      <div class="auth-bg">
        <div class="bg-blob blob-1"></div>
        <div class="bg-blob blob-2"></div>
      </div>

      <div class="auth-container">
        <a routerLink="/" class="auth-logo">
          <span>⚡</span> ERP<strong>Pro</strong>
        </a>

        <app-custom-card title="Crear cuenta" subtitle="Únete a más de 5,000 empresas" icon="🚀">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
            <app-custom-input
              formControlName="name"
              label="Nombre completo"
              type="text"
              placeholder="César Ramírez"
              inputId="register-name"
              [hasError]="isFieldInvalid('name')"
              errorMessage="El nombre es obligatorio (mínimo 3 caracteres)"
            />

            <app-custom-input
              formControlName="email"
              label="Correo Electrónico"
              type="email"
              placeholder="tu@empresa.com"
              inputId="register-email"
              [hasError]="isFieldInvalid('email')"
              [errorMessage]="getEmailError()"
            />

            <app-custom-input
              formControlName="password"
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              inputId="register-password"
              [hasError]="isFieldInvalid('password')"
              errorMessage="La contraseña debe tener al menos 8 caracteres"
            />

            <app-custom-input
              formControlName="confirmPassword"
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite tu contraseña"
              inputId="register-confirm"
              [hasError]="isConfirmInvalid()"
              errorMessage="Las contraseñas no coinciden"
            />

            <!-- Password strength indicator -->
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
            }

            @if (errorMessage()) {
              <div class="auth-error">
                <span>⚠️</span> {{ errorMessage() }}
              </div>
            }

            @if (successMessage()) {
              <div class="auth-success">
                <span>✅</span> {{ successMessage() }}
              </div>
            }

            <app-custom-button
              label="Crear cuenta"
              icon="pi pi-user-plus"
              variant="primary"
              size="md"
              [fullWidth]="true"
              [loading]="isLoading()"
            />
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
    }

    .auth-bg { position: absolute; inset: 0; pointer-events: none; }
    .bg-blob {
      position: absolute; border-radius: 50%;
      filter: blur(80px); opacity: 0.4;
    }
    .blob-1 {
      width: 500px; height: 500px; bottom: -20%; right: -10%;
      background: radial-gradient(circle, #7c3aed, transparent);
    }
    .blob-2 {
      width: 400px; height: 400px; top: -15%; left: -10%;
      background: radial-gradient(circle, #0891b2, transparent); opacity: 0.3;
    }

    .auth-container {
      position: relative; z-index: 5;
      width: 100%; max-width: 460px;
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

    .auth-form { display: flex; flex-direction: column; gap: 1.1rem; }

    /* Password strength */
    .password-strength {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0;
    }
    .strength-label { font-size: 0.78rem; color: #6b7280; white-space: nowrap; }
    .strength-bars { display: flex; gap: 4px; flex: 1; }
    .strength-bar {
      height: 4px; border-radius: 2px; flex: 1;
      background: rgba(255,255,255,0.1);
      transition: background 0.3s ease;
    }
    .strength-bar.active-weak { background: #ef4444; }
    .strength-bar.active-fair { background: #f59e0b; }
    .strength-bar.active-good { background: #3b82f6; }
    .strength-bar.active-strong { background: #10b981; }
    .strength-text { font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .strength-text.weak { color: #ef4444; }
    .strength-text.fair { color: #f59e0b; }
    .strength-text.good { color: #3b82f6; }
    .strength-text.strong { color: #10b981; }

    .auth-error, .auth-success {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.88rem;
    }
    .auth-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; }
    .auth-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; }

    .auth-footer { margin-top: 1.5rem; text-align: center; }
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

  readonly registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatchValidator });

  isFieldInvalid(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  isConfirmInvalid(): boolean {
    const control = this.registerForm.get('confirmPassword');
    return !!(control?.touched && this.registerForm.hasError('passwordMismatch'));
  }

  getEmailError(): string {
    const control = this.registerForm.get('email');
    if (control?.hasError('required')) return 'El correo es obligatorio';
    if (control?.hasError('email')) return 'Ingresa un correo válido';
    return '';
  }

  get passwordStrength(): number {
    const password = this.registerForm.get('password')?.value ?? '';
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
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

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { name, email, password } = this.registerForm.value;
    const userData: RegisterRequest = { name: name!, email: email!, password: password! };

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.successMessage.set(`¡Cuenta creada! Bienvenido, ${response.data?.name}.`);
          setTimeout(() => this.router.navigate(['/dashboard']), 1200);
        } else {
          this.errorMessage.set(response.message);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al crear la cuenta. El email ya podría estar en uso.');
      },
    });
  }
}
