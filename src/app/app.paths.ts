export const APP_PATHS = {
    landing: '/',
    login: '/login',
    register: '/register',
    home: '/home',
    dashboard: '/home',
    group: '/home/group',
    tickets: '/home/tickets',
    usuarios: '/home/usuarios',
    perfil: '/home/perfil',
} as const;

export type AppPath = (typeof APP_PATHS)[keyof typeof APP_PATHS];
