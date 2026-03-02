/** Archivo centralizado de rutas del proyecto ERP */

export const APP_PATHS = {
    landing: '/',
    login: '/login',
    register: '/register',
    home: '/home',
    group: '/home/group',
    user: '/home/user',
} as const;

export type AppPath = (typeof APP_PATHS)[keyof typeof APP_PATHS];
