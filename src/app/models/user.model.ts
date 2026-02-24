export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
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

/** Credenciales hardcodeadas para validación en el frontend */
export interface HardcodedCredential {
    email: string;
    password: string;
    user: User;
}
