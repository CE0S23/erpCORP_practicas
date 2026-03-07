import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CustomButton } from '../../components/custom-button/custom-button';
import { CustomInput } from '../../components/custom-input/custom-input';
import { CustomCard } from '../../components/custom-card/custom-card';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';
import { APP_PATHS } from '../../app.paths';

@Component({
  selector: 'app-login',
  standalone: true,
  providers: [MessageService],
  imports: [ReactiveFormsModule, RouterLink, CustomButton, CustomInput, CustomCard, ToastModule],
  template: `
    <p-toast position="top-right" />
    <div class="auth-page">
      <div class="auth-bg">
        <div class="bg-blob blob-1"></div>
        <div class="bg-blob blob-2"></div>
        <div class="bg-blob blob-3"></div>
      </div>

      <div class="auth-container">
        <a [routerLink]="paths.landing" class="auth-logo">
          ERP<strong>Pro</strong>
        </a>

        <app-custom-card title="Bienvenido de vuelta" subtitle="Ingresa tus credenciales para continuar">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
            <app-custom-input
              formControlName="email"
              label="Correo Electronico"
              type="email"
              placeholder="tu@empresa.com"
              inputId="login-email"
              [hasError]="isFieldInvalid('email')"
              [errorMessage]="getEmailError()"
            />

            <app-custom-input
              formControlName="password"
              label="Contrasena"
              type="password"
              placeholder="**********"
              inputId="login-password"
              [hasError]="isFieldInvalid('password')"
              errorMessage="La contrasena es obligatoria"
            />

            <app-custom-button
              label="Iniciar Sesion"
              icon="pi pi-sign-in"
              variant="primary"
              size="md"
              [fullWidth]="true"
              [loading]="isLoading()"
              (clicked)="onSubmit()"
            />
          </form>

          <div class="credentials-hint">
            <p class="hint-title">Credenciales de prueba</p>
            <div class="hint-row">
              <span class="hint-badge admin">ADMIN</span>
              <code>admin&#64;erp.com</code>
              <code>Admin&#64;Secure1</code>
            </div>
            <div class="hint-row">
              <span class="hint-badge medium">MEDIUM</span>
              <code>medium&#64;erp.com</code>
              <code>Medium&#64;Secure1</code>
            </div>
            <div class="hint-row">
              <span class="hint-badge user">BASE</span>
              <code>cesar&#64;erp.com</code>
              <code>Cesar&#64;Secure1</code>
            </div>
          </div>

          <div class="auth-footer">
            <p>No tienes cuenta? <a [routerLink]="paths.register" class="auth-link">Registrate aqui</a></p>
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
    .bg-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4; }
    .blob-1 { width: 500px; height: 500px; top: -15%; left: -10%; background: radial-gradient(circle, #4f46e5, transparent); }
    .blob-2 { width: 400px; height: 400px; bottom: -15%; right: -10%; background: radial-gradient(circle, #7c3aed, transparent); }
    .blob-3 { width: 300px; height: 300px; top: 40%; left: 50%; background: radial-gradient(circle, #0891b2, transparent); opacity: 0.2; }

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
    }
    .auth-logo strong { font-weight: 800; color: #6366f1; }

    :host ::ng-deep .p-card { background: rgba(17, 17, 34, 0.85) !important; border: 1px solid rgba(99, 102, 241, 0.25) !important; backdrop-filter: blur(20px); }
    :host ::ng-deep .card-title { color: #f9fafb !important; }
    :host ::ng-deep .card-subtitle { color: #6b7280 !important; }
    :host ::ng-deep .custom-input-label { color: #9ca3af !important; }
    :host ::ng-deep .custom-input-field { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; color: #f9fafb !important; }
    :host ::ng-deep .custom-input-field:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.2) !important; }

    .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }

    .credentials-hint {
      margin-top: 1.25rem;
      background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.18);
      border-radius: 12px; padding: 0.85rem 1rem;
    }
    .hint-title { font-size: 0.78rem; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 0.6rem 0; }
    .hint-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap; }
    .hint-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
    .hint-badge.admin { background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
    .hint-badge.medium { background: rgba(139,92,246,0.15); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.3); }
    .hint-badge.user  { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
    .hint-row code { font-size: 0.78rem; color: #d1d5db; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 5px; }

    .auth-footer { margin-top: 1.5rem; text-align: center; }
    .auth-footer p { color: #6b7280; font-size: 0.88rem; }
    .auth-link { color: #818cf8; text-decoration: none; font-weight: 600; }
    .auth-link:hover { color: #a5b4fc; }
  `],
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly paths = APP_PATHS;
  readonly isLoading = signal(false);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getEmailError(): string {
    const control = this.loginForm.get('email');
    if (control?.hasError('required')) return 'El correo es obligatorio';
    if (control?.hasError('email')) return 'Ingresa un correo valido';
    return '';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const credentials = this.loginForm.value as LoginRequest;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.messageService.add({
            severity: 'success',
            summary: '¡Bienvenido!',
            detail: `Sesión iniciada como ${response.data?.name}`,
            life: 3000,
          });
          setTimeout(() => this.router.navigate([this.paths.home]), 800);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error de autenticación',
            detail: response.message,
            life: 4000,
          });
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error inesperado',
          detail: 'No se pudo conectar. Intenta nuevamente.',
          life: 4000,
        });
      },
    });
  }
}
