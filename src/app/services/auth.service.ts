import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
    ApiResponse, AuthState, HardcodedCredential,
    LoginRequest, RegisterRequest, User,
    createUserWithDefaultPermissions,
} from '../models/user.model';
import { Permission, ROLE_DEFAULT_PERMISSIONS } from '../models/role.model';

/** Catalogo central de usuarios hardcodeados (simula base de datos) */
export const SYSTEM_USERS = signal<User[]>([
    createUserWithDefaultPermissions({
        id: 'sa1',
        username: 'super_admin',
        name: 'Super Admin',
        email: 'super@erp.com',
        role: 'superAdmin',
    }),
    createUserWithDefaultPermissions({
        id: 'u_admin',
        username: 'admin_erp',
        name: 'Admin ERP',
        email: 'admin@erp.com',
        role: 'admin',
    }),
    createUserWithDefaultPermissions({
        id: 'u_medium',
        username: 'medium_erp',
        name: 'Medium User',
        email: 'medium@erp.com',
        role: 'medium',
    }),
    createUserWithDefaultPermissions({
        id: 'u_cesar',
        username: 'cesar_ramirez',
        name: 'Cesar Ramirez',
        email: 'cesar@erp.com',
        role: 'user',
    }),
]);

const HARDCODED_CREDENTIALS: Array<{ email: string; password: string; userId: string }> = [
    { email: 'super@erp.com',  password: 'Super@Secure1',  userId: 'sa1' },
    { email: 'admin@erp.com',  password: 'Admin@Secure1',  userId: 'u_admin' },
    { email: 'medium@erp.com', password: 'Medium@Secure1', userId: 'u_medium' },
    { email: 'cesar@erp.com',  password: 'Cesar@Secure1',  userId: 'u_cesar' },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly initialState: AuthState = { user: null, isAuthenticated: false, token: null };
    private readonly authState$ = new BehaviorSubject<AuthState>(this.initialState);
    readonly authState: Observable<AuthState> = this.authState$.asObservable();

    get currentUser(): User | null { return this.authState$.value.user; }
    get isAuthenticated(): boolean { return this.authState$.value.isAuthenticated; }

    login(credentials: LoginRequest): Observable<ApiResponse<User>> {
        const cred = HARDCODED_CREDENTIALS.find(
            c => c.email.toLowerCase() === credentials.email.toLowerCase()
                && c.password === credentials.password
        );
        if (!cred) {
            return of<ApiResponse<User>>({ success: false, message: 'Credenciales incorrectas.' });
        }

        const user = SYSTEM_USERS().find(u => u.id === cred.userId);
        if (!user) {
            return of<ApiResponse<User>>({ success: false, message: 'Usuario no encontrado en el sistema.' });
        }
        if (!user.enabled) {
            return of<ApiResponse<User>>({ success: false, message: 'Tu cuenta ha sido deshabilitada. Contacta al administrador.' });
        }

        this.authState$.next({ user, isAuthenticated: true, token: `token-${user.id}-${Date.now()}` });
        return of<ApiResponse<User>>({ success: true, message: 'Login exitoso.', data: user });
    }

    register(userData: RegisterRequest): Observable<ApiResponse<User>> {
        const emailTaken = SYSTEM_USERS().some(u => u.email === userData.email);
        if (emailTaken) {
            return of<ApiResponse<User>>({ success: false, message: 'Ya existe una cuenta con ese correo.' });
        }

        const newUser = createUserWithDefaultPermissions({
            id: `reg-${Date.now()}`,
            username: userData.username,
            name: userData.name,
            email: userData.email,
            role: 'user',
        });

        SYSTEM_USERS.update(list => [...list, newUser]);
        this.authState$.next({ user: newUser, isAuthenticated: true, token: `token-${newUser.id}` });
        return of<ApiResponse<User>>({ success: true, message: 'Cuenta creada exitosamente.', data: newUser });
    }

    /** Actualiza los permisos de un usuario en el catalogo global */
    updateUserPermissions(userId: string, permissions: Permission[]): void {
        SYSTEM_USERS.update(list =>
            list.map(u => u.id === userId ? { ...u, permissions } : u)
        );
        // Si es el usuario actual, actualizar su sesion
        if (this.currentUser?.id === userId) {
            const updated = SYSTEM_USERS().find(u => u.id === userId);
            if (updated) {
                this.authState$.next({ ...this.authState$.value, user: updated });
            }
        }
    }

    /** Habilita o deshabilita una cuenta de usuario */
    toggleUserEnabled(userId: string): void {
        SYSTEM_USERS.update(list =>
            list.map(u => u.id === userId ? { ...u, enabled: !u.enabled } : u)
        );
    }

    /** Crea un nuevo usuario desde el panel de administracion */
    createUser(data: Omit<User, 'id' | 'permissions' | 'enabled'>): Observable<ApiResponse<User>> {
        const emailTaken = SYSTEM_USERS().some(u => u.email === data.email);
        if (emailTaken) {
            return of<ApiResponse<User>>({ success: false, message: 'Ya existe un usuario con ese correo.' });
        }
        const newUser = createUserWithDefaultPermissions({
            id: `usr-${Date.now()}`,
            ...data,
        });
        SYSTEM_USERS.update(list => [...list, newUser]);
        return of<ApiResponse<User>>({ success: true, message: 'Usuario creado correctamente.', data: newUser });
    }

    /** Elimina un usuario del sistema */
    deleteUser(userId: string): void {
        SYSTEM_USERS.update(list => list.filter(u => u.id !== userId));
    }

    logout(): void {
        this.authState$.next(this.initialState);
    }
}
