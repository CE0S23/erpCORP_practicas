import { Routes } from '@angular/router';
import { permissionGuard } from './guards/permission.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/landing/landing').then((m) => m.Landing),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login/login').then((m) => m.Login),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./pages/register/register').then((m) => m.Register),
    },
    {
        path: 'home',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
        children: [
            {
                path: '',
                redirectTo: 'dashboard-all',
                pathMatch: 'full',
            },
            {
                path: 'dashboard-all',
                loadComponent: () =>
                    import('./pages/home/home').then((m) => m.Home),
            },
            {
                path: 'group',
                canActivate: [permissionGuard],
                data: { requiredPermission: 'view_groups' },
                loadComponent: () =>
                    import('./group/group').then((m) => m.GroupPage),
            },
            {
                path: 'tickets',
                canActivate: [permissionGuard],
                data: { requiredPermission: 'view_tickets' },
                loadComponent: () =>
                    import('./pages/tickets/tickets').then((m) => m.TicketsPage),
            },
            {
                path: 'usuarios',
                canActivate: [permissionGuard],
                data: { requiredRoles: ['admin', 'superAdmin'] },
                loadComponent: () =>
                    import('./components/usuarios/usuarios').then((m) => m.UsuariosPage),
            },
            {
                path: 'perfil',
                loadComponent: () =>
                    import('./components/perfil/perfil').then((m) => m.Perfil),
            },
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
