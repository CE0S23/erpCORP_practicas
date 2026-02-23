import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CustomButton } from '../../components/custom-button/custom-button';
import { CustomInput } from '../../components/custom-input/custom-input';
import { CustomCard } from '../../components/custom-card/custom-card';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CustomButton, CustomInput, CustomCard],
  template: `
    <div class="auth-page">
      <div class="auth-bg">
        <div class="bg-blob blob-1"></div>
        <div class="bg-blob blob-2"></div>
        <div class="bg-blob blob-3"></div>
      </div>

      <div class="auth-container">
        <!-- Logo -->
        <a routerLink="/" class="auth-logo">
          <span>⚡</span> ERP<strong>Pro</strong>
        </a>

        <app-custom-card title="Bienvenido de vuelta" subtitle="Ingresa tus credenciales para continuar" icon="🔐">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
            <app-custom-input
              formControlName="email"
              label="Correo Electrónico"
              type="email"
              placeholder="tu@empresa.com"
              inputId="login-email"
              [hasError]="isFieldInvalid('email')"
              [errorMessage]="getEmailError()"
            />

            <app-custom-input
              formControlName="password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              inputId="login-password"
              [hasError]="isFieldInvalid('password')"
              errorMessage="La contraseña debe tener al menos 6 caracteres"
            />

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
              label="Iniciar Sesión"
              icon="pi pi-sign-in"
              variant="primary"
              size="md"
              [fullWidth]="true"
              [loading]="isLoading()"
            />
          </form>

          <div class="auth-footer">
            <p>¿No tienes cuenta? <a routerLink="/register" class="auth-link">Regístrate aquí</a></p>
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
      width: 500px; height: 500px; top: -15%;  left: -10%;
      background: radial-gradient(circle, #4f46e5, transparent);
    }
    .blob-2 {
      width: 400px; height: 400px; bottom: -15%; right: -10%;
      background: radial-gradient(circle, #7c3aed, transparent);
    }
    .blob-3 {
      width: 300px; height: 300px; top: 40%; left: 50%;
      background: radial-gradient(circle, #0891b2, transparent); opacity: 0.2;
    }

    .auth-container {
      position: relative; z-index: 5;
      width: 100%; max-width: 440px;
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

    .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }

    .auth-error, .auth-success {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.88rem;
      animation: shake 0.3s ease;
    }
    .auth-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; }
    .auth-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .auth-footer { margin-top: 1.5rem; text-align: center; }
    .auth-footer p { color: #6b7280; font-size: 0.88rem; }
    .auth-link { color: #818cf8; text-decoration: none; font-weight: 600; }
    .auth-link:hover { color: #a5b4fc; text-decoration: underline; }
  `],
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getEmailError(): string {
    const control = this.loginForm.get('email');
    if (control?.hasError('required')) return 'El correo es obligatorio';
    if (control?.hasError('email')) return 'Ingresa un correo válido';
    return '';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const credentials = this.loginForm.value as LoginRequest;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.successMessage.set(`¡Bienvenido, ${response.data?.name}!`);
          setTimeout(() => this.router.navigate(['/dashboard']), 1000);
        } else {
          this.errorMessage.set(response.message);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Credenciales incorrectas. Verifica tu email y contraseña.');
      },
    });
  }
}
