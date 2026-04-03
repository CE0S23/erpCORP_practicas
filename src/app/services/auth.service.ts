import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, firstValueFrom } from 'rxjs';
import { tap, switchMap, map, catchError } from 'rxjs/operators';
import {
    ApiResponse, AuthState, HardcodedCredential,
    LoginRequest, RegisterRequest, User,
    createUserWithDefaultPermissions,
} from '../models/user.model';
import { Permission, AppRole, ROLE_DEFAULT_PERMISSIONS } from '../models/role.model';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'erp_token';

/** Catálogo reactivo de usuarios del sistema (compatibilidad con componentes existentes) */
export const SYSTEM_USERS = signal<User[]>([]);

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http   = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly apiUrl = environment.apiUrl;

    /** Signal con el usuario en sesión */
    readonly currentUser = signal<User | null>(null);

    /** Signal con el estado completo de autenticación */
    readonly authState = signal<AuthState>({
        user: null,
        isAuthenticated: false,
        token: null,
        loading: false,
    });

    // ── Login ──────────────────────────────────────────────────────────────────

    login(email: string, password: string): Observable<void> {
        this.authState.update(s => ({ ...s, loading: true }));

        return this.http.post<{ token?: string; access_token?: string }>(
            `${this.apiUrl}/auth/login`, { email, password }
        ).pipe(
            tap(res => {
                const token = res.token ?? res.access_token ?? '';
                localStorage.setItem(TOKEN_KEY, token);
            }),
            switchMap(() => this.me()),
            tap(() => this.router.navigate(['/home/dashboard-all'])),
            map(() => void 0 as void),
            catchError(err => {
                this.authState.update(s => ({ ...s, loading: false }));
                throw err;
            })
        );
    }

    // ── Logout ─────────────────────────────────────────────────────────────────

    logout(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).pipe(
            tap({ next: () => this._clearSession(), error: () => this._clearSession() }),
            map(() => void 0 as void),
            catchError(() => {
                this._clearSession();
                return of(void 0 as void);
            })
        );
    }

    // ── Register ───────────────────────────────────────────────────────────────

    register(data: RegisterRequest): Observable<ApiResponse<User>> {
        return this.http.post<any>(`${this.apiUrl}/api/users`, data).pipe(
            map(dto => ({
                success: true as const,
                message: 'Usuario creado correctamente.',
                data: this._mapDtoToUser(dto),
            })),
            catchError(err => {
                const message = err?.error?.message ?? 'Error al crear la cuenta.';
                return of({ success: false as const, message } as ApiResponse<User>);
            })
        );
    }

    // ── Me ─────────────────────────────────────────────────────────────────────

    me(): Observable<User> {
        return this.http.get<any>(`${this.apiUrl}/auth/me`).pipe(
            map(res => this._mapDtoToUser(res?.user ?? res)),
            tap(user => {
                this.currentUser.set(user);
                this.authState.set({
                    user,
                    isAuthenticated: true,
                    token: localStorage.getItem(TOKEN_KEY),
                    loading: false,
                });
                // Actualiza el usuario en SYSTEM_USERS si ya existe
                SYSTEM_USERS.update(list => {
                    const exists = list.some(u => u.id === user.id);
                    return exists ? list.map(u => u.id === user.id ? user : u) : [...list, user];
                });
            })
        );
    }

    // ── Init (APP_INITIALIZER) ─────────────────────────────────────────────────

    async initAuth(): Promise<void> {
        if (!localStorage.getItem(TOKEN_KEY)) return;

        try {
            await firstValueFrom(this.me());
            // Carga lista de usuarios para funciones admin (falla en silencio)
            this.loadUsers().subscribe();
        } catch {
            localStorage.removeItem(TOKEN_KEY);
        }
    }

    // ── Carga de usuarios (admin) ──────────────────────────────────────────────

    loadUsers(): Observable<User[]> {
        return this.http.get<any[]>(`${this.apiUrl}/api/users`).pipe(
            map(dtos => dtos.map(dto => this._mapDtoToUser(dto))),
            tap(users => SYSTEM_USERS.set(users)),
            catchError(() => of([] as User[]))
        );
    }

    // ── Helpers de permisos ────────────────────────────────────────────────────

    hasPermission(permission: string): boolean {
        const user = this.currentUser();
        if (!user?.enabled) return false;
        return user.permissions?.includes(permission as Permission) ?? false;
    }

    hasRole(role: AppRole): boolean {
        const user = this.currentUser();
        if (!user) return false;
        const hierarchy: Record<AppRole, number> = {
            superAdmin: 1, admin: 2, medium: 3, user: 4,
        };
        return (hierarchy[user.role] ?? 99) <= (hierarchy[role] ?? 99);
    }

    // ── Gestión local de usuarios (compatibilidad con página Usuarios) ─────────

    updateUserPermissions(userId: string, permissions: Permission[]): void {
        SYSTEM_USERS.update(list =>
            list.map(u => u.id === userId ? { ...u, permissions } : u)
        );
        if (this.currentUser()?.id === userId) {
            const updated = SYSTEM_USERS().find(u => u.id === userId);
            if (updated) {
                this.currentUser.set(updated);
                this.authState.update(s => ({ ...s, user: updated }));
            }
        }
    }

    toggleUserEnabled(userId: string): void {
        SYSTEM_USERS.update(list =>
            list.map(u => u.id === userId ? { ...u, enabled: !u.enabled } : u)
        );
    }

    createUser(data: Omit<User, 'id' | 'permissions' | 'enabled'>): Observable<ApiResponse<User>> {
        const emailTaken = SYSTEM_USERS().some(u => u.email === data.email);
        if (emailTaken) {
            return of<ApiResponse<User>>({ success: false, message: 'Ya existe un usuario con ese correo.' });
        }
        const newUser = createUserWithDefaultPermissions({ id: `usr-${Date.now()}`, ...data });
        SYSTEM_USERS.update(list => [...list, newUser]);
        return of<ApiResponse<User>>({ success: true, message: 'Usuario creado correctamente.', data: newUser });
    }

    deleteUser(userId: string): void {
        SYSTEM_USERS.update(list => list.filter(u => u.id !== userId));
    }

    // ── Privados ───────────────────────────────────────────────────────────────

    private _clearSession(): void {
        localStorage.removeItem(TOKEN_KEY);
        this.currentUser.set(null);
        this.authState.set({ user: null, isAuthenticated: false, token: null, loading: false });
        this.router.navigate(['/login']);
    }

    private _mapDtoToUser(dto: any): User {
        const role = (dto.role ?? dto.roles?.[0]?.name ?? 'user') as AppRole;
        return {
            id:          dto.id,
            username:    dto.username ?? dto.email?.split('@')[0] ?? '',
            name:        dto.name,
            email:       dto.email,
            role,
            permissions: dto.permissions ?? ROLE_DEFAULT_PERMISSIONS[role] ?? [],
            enabled:     dto.isActive ?? dto.enabled ?? dto.is_active ?? true,
            avatarUrl:   dto.avatarUrl ?? dto.avatar_url,
        };
    }
}
