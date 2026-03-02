import { Routes } from '@angular/router';

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
        loadComponent: () =>
            import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./pages/home/home').then((m) => m.Home),
            },
            {
                path: 'group',
                loadComponent: () =>
                    import('./group/group').then((m) => m.GroupPage),
            },
            {
                path: 'user',
                loadComponent: () =>
                    import('./user/user').then((m) => m.UserPage),
            },
        ],
    },
    {
        path: '**',
        redirectTo: '',
    },
];
