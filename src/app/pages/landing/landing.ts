import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CustomButton } from '../../components/custom-button/custom-button';
import { CustomCard } from '../../components/custom-card/custom-card';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CustomButton, CustomCard],
  template: `
    <div class="landing-wrapper">
      <!-- Hero Section -->
      <header class="hero">
        <nav class="hero-nav">
          <div class="logo">
            <span class="logo-icon">⚡</span>
            <span class="logo-text">ERP<strong>Pro</strong></span>
          </div>
          <div class="nav-actions">
            <app-custom-button
              label="Iniciar Sesión"
              variant="ghost"
              size="sm"
              (clicked)="goToLogin()"
            />
            <app-custom-button
              label="Registrarse"
              variant="primary"
              size="sm"
              (clicked)="goToRegister()"
            />
          </div>
        </nav>

        <div class="hero-content">
          <div class="hero-badge">🚀 Sistema ERP de próxima generación</div>
          <h1 class="hero-title">
            Gestiona tu empresa<br />
            <span class="gradient-text">de forma inteligente</span>
          </h1>
          <p class="hero-subtitle">
            Centraliza operaciones, automatiza procesos y toma decisiones
            basadas en datos en tiempo real.
          </p>
          <div class="hero-cta">
            <app-custom-button
              label="Comenzar gratis"
              icon="pi pi-arrow-right"
              variant="primary"
              size="lg"
              [rounded]="true"
              (clicked)="goToRegister()"
            />
            <app-custom-button
              label="Ver demo"
              icon="pi pi-play"
              variant="secondary"
              size="lg"
              [outlined]="true"
              (clicked)="scrollToFeatures()"
            />
          </div>
        </div>

        <div class="hero-visual">
          <div class="orbit-ring ring-1"></div>
          <div class="orbit-ring ring-2"></div>
          <div class="orbit-ring ring-3"></div>
          <div class="dashboard-preview">
            <div class="preview-bar">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <div class="preview-stats">
              <div class="stat-item">
                <span class="stat-num">$2.4M</span>
                <span class="stat-label">Ingresos</span>
              </div>
              <div class="stat-item">
                <span class="stat-num">1,284</span>
                <span class="stat-label">Clientes</span>
              </div>
              <div class="stat-item">
                <span class="stat-num">98%</span>
                <span class="stat-label">Satisfacción</span>
              </div>
            </div>
            <div class="preview-chart">
              <div class="chart-bar" style="height:45%"></div>
              <div class="chart-bar" style="height:70%"></div>
              <div class="chart-bar" style="height:55%"></div>
              <div class="chart-bar" style="height:90%"></div>
              <div class="chart-bar" style="height:65%"></div>
              <div class="chart-bar" style="height:80%"></div>
            </div>
          </div>
        </div>
      </header>

      <!-- Features Section -->
      <section class="features" id="features">
        <div class="section-header">
          <h2>Todo lo que necesitas</h2>
          <p>Módulos integrados para gestionar cada aspecto de tu negocio</p>
        </div>
        <div class="features-grid">
          @for (feature of features; track feature.title) {
            <app-custom-card [icon]="feature.icon" [title]="feature.title">
              <p class="feature-desc">{{ feature.description }}</p>
            </app-custom-card>
          }
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="cta-content">
          <h2>¿Listo para transformar tu empresa?</h2>
          <p>Únete a más de 5,000 empresas que ya confían en ERPPro</p>
          <app-custom-button
            label="Crear cuenta gratuita"
            icon="pi pi-user-plus"
            variant="primary"
            size="lg"
            [rounded]="true"
            (clicked)="goToRegister()"
          />
        </div>
      </section>

      <footer class="landing-footer">
        <p>© 2026 ERPPro · Desarrollado por César Ramírez</p>
      </footer>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    :host { display: block; }

    .landing-wrapper {
      font-family: 'Inter', sans-serif;
      background: #0a0a14;
      color: #f9fafb;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* NAV */
    .hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    .hero::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.35) 0%, transparent 70%),
                  radial-gradient(ellipse 50% 40% at 90% 80%, rgba(139,92,246,0.2) 0%, transparent 60%);
      pointer-events: none;
    }
    .hero-nav {
      position: relative; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.5rem 4rem;
    }
    .logo { display: flex; align-items: center; gap: 0.5rem; }
    .logo-icon { font-size: 1.8rem; }
    .logo-text { font-size: 1.4rem; font-weight: 300; letter-spacing: -0.02em; color: #e5e7eb; }
    .logo-text strong { font-weight: 800; color: #6366f1; }
    .nav-actions { display: flex; gap: 0.75rem; }

    /* HERO CONTENT */
    .hero-content {
      position: relative; z-index: 5;
      display: flex; flex-direction: column; align-items: center;
      text-align: center; padding: 5rem 2rem 3rem; gap: 1.5rem;
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.4);
      color: #a5b4fc; padding: 0.4rem 1rem; border-radius: 50px;
      font-size: 0.85rem; font-weight: 500;
    }
    .hero-title {
      font-size: clamp(2.5rem, 6vw, 4.5rem);
      font-weight: 800; line-height: 1.1;
      letter-spacing: -0.03em; color: #f9fafb; margin: 0;
    }
    .gradient-text {
      background: linear-gradient(135deg, #6366f1, #a855f7, #06b6d4);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero-subtitle {
      font-size: 1.15rem; color: #9ca3af; max-width: 540px; line-height: 1.7; margin: 0;
    }
    .hero-cta { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }

    /* VISUAL */
    .hero-visual {
      position: relative; display: flex; justify-content: center; align-items: center;
      padding: 2rem 4rem 4rem; flex: 1;
    }
    .orbit-ring {
      position: absolute; border-radius: 50%;
      border: 1px solid rgba(99,102,241,0.15);
      animation: orbit-spin 20s linear infinite;
    }
    .ring-1 { width: 400px; height: 400px; }
    .ring-2 { width: 550px; height: 550px; animation-duration: 30s; animation-direction: reverse; border-color: rgba(168,85,247,0.12); }
    .ring-3 { width: 700px; height: 700px; animation-duration: 40s; border-color: rgba(6,182,212,0.08); }
    @keyframes orbit-spin { to { transform: rotate(360deg); } }

    .dashboard-preview {
      position: relative; z-index: 5;
      background: rgba(17,17,34,0.9);
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 16px; padding: 1.5rem;
      width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
    }
    .preview-bar { display: flex; gap: 6px; margin-bottom: 1.2rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.red { background:#ef4444; }
    .dot.yellow { background:#f59e0b; }
    .dot.green { background:#10b981; }
    .preview-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-item { text-align: center; }
    .stat-num { display: block; font-size: 1.4rem; font-weight: 800; color: #6366f1; }
    .stat-label { font-size: 0.75rem; color: #6b7280; }
    .preview-chart { display: flex; align-items: flex-end; gap: 8px; height: 80px; }
    .chart-bar {
      flex: 1; border-radius: 6px 6px 0 0;
      background: linear-gradient(180deg, #6366f1, #4f46e5);
      animation: chart-grow 1s ease forwards;
    }
    @keyframes chart-grow { from { height: 0 !important; } }

    /* FEATURES */
    .features { padding: 6rem 4rem; }
    .section-header { text-align: center; margin-bottom: 3rem; }
    .section-header h2 { font-size: 2.2rem; font-weight: 800; color: #f9fafb; margin: 0 0 0.75rem; }
    .section-header p { color: #9ca3af; font-size: 1.05rem; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1100px; margin: 0 auto; }
    .feature-desc { color: #6b7280; line-height: 1.6; margin: 0; font-size: 0.9rem; }
    :host ::ng-deep .features-grid .p-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
    :host ::ng-deep .features-grid .card-title { color: #f9fafb; font-size: 1.1rem; }

    /* CTA */
    .cta-section {
      margin: 0 4rem 4rem; border-radius: 24px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0891b2 100%);
      padding: 5rem 2rem; text-align: center;
      position: relative; overflow: hidden;
    }
    .cta-section::before {
      content: '';
      position: absolute; inset: -50%; border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    }
    .cta-content { position: relative; z-index: 1; }
    .cta-content h2 { font-size: 2.2rem; font-weight: 800; margin: 0 0 1rem; }
    .cta-content p { color: rgba(255,255,255,0.8); font-size: 1.1rem; margin: 0 0 2rem; }

    /* FOOTER */
    .landing-footer { text-align: center; padding: 2rem; color: #4b5563; font-size: 0.85rem; }

    @media (max-width: 768px) {
      .hero-nav { padding: 1.2rem 1.5rem; }
      .hero-content { padding: 3rem 1.5rem 2rem; }
      .hero-visual { padding: 1rem 1.5rem 3rem; }
      .dashboard-preview { width: 100%; max-width: 340px; }
      .features { padding: 4rem 1.5rem; }
      .cta-section { margin: 0 1.5rem 3rem; padding: 3rem 1.5rem; }
      .orbit-ring { display: none; }
    }
  `],
})
export class Landing {
  readonly features: Feature[] = [
    { icon: '💼', title: 'Gestión Financiera', description: 'Control total de ingresos, gastos, facturación y reportes financieros en tiempo real.' },
    { icon: '📦', title: 'Inventario', description: 'Administra tu stock, alertas automáticas de reposición y trazabilidad completa.' },
    { icon: '👥', title: 'Recursos Humanos', description: 'Nómina, asistencia, evaluaciones y gestión del talento en un solo lugar.' },
    { icon: '📊', title: 'Analytics & BI', description: 'Dashboards interactivos y reportes avanzados para decisiones estratégicas.' },
    { icon: '🔗', title: 'Integraciones', description: 'Conecta con tus herramientas favoritas: SAP, Salesforce, Stripe y más.' },
    { icon: '🔒', title: 'Seguridad', description: 'Autenticación multifactor, roles y permisos granulares para tu equipo.' },
  ];

  constructor(private readonly router: Router) { }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  scrollToFeatures(): void {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }
}
