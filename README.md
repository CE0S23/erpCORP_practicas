# ERPPro — Sistema ERP Escalable

> Angular 20 + Node.js 22 + PrimeNG | Arquitectura desacoplada

---

## 🚀 Cómo correr el proyecto

### Frontend (Angular 20)
```bash
npm start          # http://localhost:4200
```

### Backend (Node.js 22 + Express)
```bash
node server.js     # http://localhost:3000
# o con hot-reload:
npm run server:dev
```

---

## 📁 Estructura del Proyecto

```
src/app/
├── models/
│   └── user.model.ts          # Interfaces: User, LoginRequest, RegisterRequest, ApiResponse
├── components/
│   ├── custom-input/          # Wrapper de pInputText (ControlValueAccessor)
│   ├── custom-button/         # Wrapper de p-button (variantes, tamaños)
│   └── custom-card/           # Wrapper de p-card (con ng-content)
├── pages/
│   ├── landing/               # Landing Page (hero + features + CTA)
│   ├── login/                 # Login con ReactiveForm
│   └── register/              # Register con validador cross-field
├── services/
│   └── auth.service.ts        # Estado de autenticación + HttpClient
└── app.routes.ts              # Lazy loading: /, /login, /register
```

---

## 🔑 Credenciales de prueba (backend en memoria)

| Email              | Password   | Rol   |
|--------------------|------------|-------|
| admin@erp.com      | admin123   | admin |
| cesar@erp.com      | cesar123   | user  |

---

## 🏗️ Principios de Ingeniería aplicados

- **Cero `any`**: Todas las entidades tienen interfaces TypeScript tipadas
- **Desacoplamiento de PrimeNG**: Las páginas solo importan `components/`, nunca PrimeNG directamente
- **Clean Code**: Lógica delegada al `AuthService`; páginas solo orquestan la UI
- **Lazy Loading**: Cada página se carga bajo demanda
- **ControlValueAccessor**: `CustomInput` compatible con `formControlName`
- **Signals** en Login/Register para estados reactivos sin Zone.js
