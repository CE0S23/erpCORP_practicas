import { AppRole, Permission, ROLE_DEFAULT_PERMISSIONS } from './role.model';

export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    role: AppRole;
    /** Permisos individuales del usuario — sobreescriben los del rol */
    permissions: Permission[];
    /** Indica si la cuenta esta habilitada */
    enabled: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    name: string;
    email: string;
    password: string;
    phone: string;
    address: string;
    birthdate: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    token: string | null;
}

/** Credenciales hardcodeadas para validacion en el frontend */
export interface HardcodedCredential {
    email: string;
    password: string;
    user: User;
}

/** Crea un usuario con los permisos por defecto segun su rol */
export function createUserWithDefaultPermissions(
    partial: Omit<User, 'permissions' | 'enabled'>
): User {
    return {
        ...partial,
        permissions: [...ROLE_DEFAULT_PERMISSIONS[partial.role]],
        enabled: true,
    };
}
