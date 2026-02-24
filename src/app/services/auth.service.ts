import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
    ApiResponse,
    AuthState,
    HardcodedCredential,
    LoginRequest,
    RegisterRequest,
    User,
} from '../models/user.model';

/**
 * =========================================================
 *  CREDENCIALES HARDCODEADAS — Práctica 3
 *  Contraseñas con al menos 10 caracteres + símbolo especial
 * =========================================================
 */
const HARDCODED_USERS: HardcodedCredential[] = [
    {
        email: 'admin@erp.com',
        password: 'Admin@Secure1',   // 13 chars, mayúscula, número, símbolo
        user: {
            id: '1',
            username: 'admin_erp',
            name: 'Admin ERP',
            email: 'admin@erp.com',
            role: 'admin',
        },
    },
    {
        email: 'cesar@erp.com',
        password: 'Cesar@Secure1',   // 13 chars, mayúscula, número, símbolo
        user: {
            id: '2',
            username: 'cesar_ramirez',
            name: 'César Ramírez',
            email: 'cesar@erp.com',
            role: 'user',
        },
    },
];

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly initialState: AuthState = {
        user: null,
        isAuthenticated: false,
        token: null,
    };

    private readonly authState$ = new BehaviorSubject<AuthState>(this.initialState);

    readonly authState: Observable<AuthState> = this.authState$.asObservable();

    /** Usuarios registrados en sesión (en memoria) */
    private readonly registeredUsers: Array<RegisterRequest> = [];

    get currentUser(): User | null {
        return this.authState$.value.user;
    }

    get isAuthenticated(): boolean {
        return this.authState$.value.isAuthenticated;
    }

    /**
     * Login contra credenciales hardcodeadas (sin llamada HTTP).
     * Simula latencia de red con delay(600ms).
     */
    login(credentials: LoginRequest): Observable<ApiResponse<User>> {
        const match = HARDCODED_USERS.find(
            (c) =>
                c.email.toLowerCase() === credentials.email.toLowerCase() &&
                c.password === credentials.password
        );

        if (match) {
            this.authState$.next({
                user: match.user,
                isAuthenticated: true,
                token: `token-${match.user.id}-${Date.now()}`,
            });
            return of<ApiResponse<User>>({
                success: true,
                message: 'Login exitoso.',
                data: match.user,
            }).pipe(delay(600));
        }

        return of<ApiResponse<User>>({
            success: false,
            message: 'Credenciales incorrectas. Verifica tu email y contraseña.',
        }).pipe(delay(600));
    }

    /**
     * Registro en memoria (validaciones de negocio en el frontend).
     */
    register(userData: RegisterRequest): Observable<ApiResponse<User>> {
        const emailTaken =
            HARDCODED_USERS.some((c) => c.email === userData.email) ||
            this.registeredUsers.some((u) => u.email === userData.email);

        if (emailTaken) {
            return of<ApiResponse<User>>({
                success: false,
                message: 'Ya existe una cuenta con ese correo electrónico.',
            }).pipe(delay(600));
        }

        this.registeredUsers.push(userData);

        const newUser: User = {
            id: `reg-${Date.now()}`,
            username: userData.username,
            name: userData.name,
            email: userData.email,
            role: 'user',
        };

        this.authState$.next({
            user: newUser,
            isAuthenticated: true,
            token: `token-${newUser.id}`,
        });

        return of<ApiResponse<User>>({
            success: true,
            message: 'Cuenta creada exitosamente.',
            data: newUser,
        }).pipe(delay(600));
    }

    logout(): void {
        this.authState$.next(this.initialState);
    }
}
