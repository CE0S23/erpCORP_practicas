# ERPPro — Sistema ERP

> Angular 20 + PrimeNG | Practicas de Seguridad Informatica — César Ramírez

---

## Como correr el proyecto

```bash
npm start
```

Abre http://localhost:4200

---

## Estructura del Proyecto

```
src/app/
├── app.paths.ts           ← Rutas centralizadas del proyecto
├── models/
│   ├── user.model.ts
│   └── group.model.ts
├── components/
│   ├── custom-input/
│   ├── custom-button/
│   ├── custom-card/
│   ├── sidebar/
│   ├── n-display/
│   ├── advance-card/
│   └── profile-card/
├── pages/
│   ├── landing/
│   ├── login/
│   ├── register/
│   └── home/
├── group/
├── user/
├── layouts/
│   └── main-layout/
└── services/
    ├── auth.service.ts
    └── group.service.ts
```

---

## Credenciales de prueba

| Email           | Password       | Rol   |
|-----------------|----------------|-------|
| admin@erp.com   | Admin@Secure1  | admin |
| cesar@erp.com   | Cesar@Secure1  | user  |

---

## Historial de Practicas

### Practica 1 — Validacion de PrimeNG
Se instalo y configuro Angular v20 con PrimeNG v18 y el tema Aura.
- Proyecto creado con Angular CLI
- PrimeNG instalado y configurado en `app.config.ts`
- Boton `p-button` en la Home page para verificar instalacion correcta
- Servidor Express basico (`server.js`) como backend auxiliar

### Practica 2 — Landing, Login y Registro
Implementacion del flujo de autenticacion completo.
- Landing page con boton CTA al login
- Login con credenciales hardcodeadas (validacion en frontend)
- Formulario de registro con validaciones:
  - Contrasena: minimo 10 caracteres, mayuscula, numero, simbolo
  - Telefono: solo numeros
  - Edad: mayor de 18 anos
- Usuarios registrados guardados en memoria (AuthService)

### Practica 3 — Vistas Group y User con MainLayout
Navegacion interior con menu lateral y paginas de grupo y usuario.
- Sidebar colapsable con links a Home, Group y User
- MainLayout: sidebar + router-outlet
- Group: tabla basica con NDisplay y AdvanceCard
- User: Listbox para seleccionar usuario + ProfileCard con datos del usuario
- Rutas anidadas bajo `/home` con lazy loading

### Practica 4 — CRUD Group + RUD User + Rutas centralizadas
Nuevos avances en las vistas interiores con logica de negocio.
- **app.paths.ts**: archivo centralizado de rutas, importado en Sidebar y Login
- **CRUD Group completo**:
  - Modelo `Group` (id, nombre, categoria, nivel, autor, miembros, tickets)
  - `GroupService` con signals reactivos (create, update, remove)
  - Tabla PrimeNG con paginacion y ordenamiento por columna
  - Dialogo de creacion y edicion con validacion
  - ConfirmDialog para eliminar con mensaje de confirmacion
  - Toast de exito/error en cada operacion
  - Stat cards con totales de grupos, miembros y tickets
- **RUD User**: Toast al cargar la pagina con info de sesion activa o advertencia si no hay usuario
- **Login**: notificaciones via Toast de PrimeNG en lugar de mensajes inline
  - Toast de bienvenida al iniciar sesion exitosamente
  - Toast de error con mensaje especifico al fallar autenticacion
- **@angular/animations** instalado y registrado con `provideAnimationsAsync()`

---

## Principios aplicados

- Solo componentes de PrimeNG para la UI (Table, Dialog, Toast, ConfirmDialog, Tag, Button, Select...)
- Signals de Angular para estado reactivo en servicios
- CSS minimo: solo para layout o colores especificos que PrimeNG no cubre
- Lazy loading en todas las rutas
- Archivo centralizado de rutas (`app.paths.ts`) para evitar strings duplicados
