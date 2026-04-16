import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, firstValueFrom } from 'rxjs';
import { tap, switchMap, map, catchError } from 'rxjs/operators';
import {
    ApiResponse, AuthState, HardcodedCredential,
    LoginRequest, RegisterRequest, User,
} from '../models/user.model';
import { Permission, AppRole, ROLE_DEFAULT_PERMISSIONS } from '../models/role.model';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'erp_token';
const PERMISSION_ALIASES: Record<string, string[]> = {
    view_tickets: ['view_tickets', 'manage_tickets'],
    create_tickets: ['create_tickets', 'manage_tickets'],
    edit_tickets: ['edit_tickets', 'manage_tickets'],
    delete_tickets: ['delete_tickets', 'manage_tickets'],
    view_groups: ['view_groups', 'manage_groups'],
    create_groups: ['create_groups', 'manage_groups'],
    edit_groups: ['edit_groups', 'manage_groups'],
    delete_groups: ['delete_groups', 'manage_groups'],
    view_users: ['view_users', 'manage_users'],
    create_users: ['create_users', 'manage_users'],
    edit_user: ['edit_user', 'manage_users'],
    delete_users: ['delete_users', 'manage_users'],
};

/** Catálogo reactivo de usuarios del sistema (compatibilidad con componentes existentes) */
export const SYSTEM_USERS = signal<User[]>([]);

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http       = inject(HttpClient);
    private readonly router     = inject(Router);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly apiUrl     = environment.apiUrl;

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
        return this.http.post<any>(`${this.apiUrl}/api/users`, {
            email: data.email,
            name: data.name,
            password: data.password,
        }).pipe(
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
        if (!isPlatformBrowser(this.platformId)) return;
        if (!localStorage.getItem(TOKEN_KEY)) return;

        try {
            await firstValueFrom(this.me());
            if (this.hasPermission('view_users')) {
                this.loadUsers().subscribe();
            }
        } catch {
            localStorage.removeItem(TOKEN_KEY);
        }
    }

    // ── Carga de usuarios (admin) ──────────────────────────────────────────────

    loadUsers(): Observable<User[]> {
        if (!this.hasPermission('view_users')) {
            return of([] as User[]);
        }

        return this.http.get<any>(`${this.apiUrl}/api/users`).pipe(
            // The interceptor unwraps { statusCode, intOpCode, data } → data.
            // The user-service paginates: data = { data: User[], total, page, ... }
            map(res => {
                const rows: any[] = Array.isArray(res) ? res : (res?.data ?? []);
                return rows.map(dto => this._mapDtoToUser(dto));
            }),
            tap(users => SYSTEM_USERS.set(users)),
            catchError(() => of([] as User[]))
        );
    }

    // ── Helpers de permisos ────────────────────────────────────────────────────

    hasPermission(permission: string): boolean {
        const user = this.currentUser();
        if (!user?.enabled) return false;
        const accepted = PERMISSION_ALIASES[permission] ?? [permission];
        return accepted.some(p => user.permissions?.includes(p as Permission));
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
        this.http.put<any>(`${this.apiUrl}/api/users/${userId}`, { permissions }).pipe(
            map(dto => this._mapDtoToUser(dto)),
            tap(updated => this._upsertSystemUser(updated)),
            catchError(() => of(null))
        ).subscribe(updated => {
            if (updated && this.currentUser()?.id === userId) {
                this.currentUser.set(updated);
                this.authState.update(s => ({ ...s, user: updated }));
            }
        });
    }

    toggleUserEnabled(userId: string): void {
        const target = SYSTEM_USERS().find(u => u.id === userId);
        if (!target) return;

        this.http.put<any>(`${this.apiUrl}/api/users/${userId}`, {
            isActive: !target.enabled,
        }).pipe(
            map(dto => this._mapDtoToUser(dto)),
            tap(updated => this._upsertSystemUser(updated)),
            catchError(() => of(null))
        ).subscribe(updated => {
            if (updated && this.currentUser()?.id === userId) {
                this.currentUser.set(updated);
                this.authState.update(s => ({ ...s, user: updated }));
            }
        });
    }

    createUser(data: Omit<User, 'id' | 'permissions' | 'enabled'> & { password?: string }): Observable<ApiResponse<User>> {
        return this.http.post<any>(`${this.apiUrl}/api/users`, {
            email:    data.email,
            name:     data.name,
            password: data.password?.trim() || 'Temporal123*',
            role:     data.role,
        }).pipe(
            map(dto => {
                const newUser = this._mapDtoToUser(dto);
                this._upsertSystemUser(newUser);
                return { success: true as const, message: 'Usuario creado correctamente.', data: newUser };
            }),
            catchError(err => {
                const message = err?.error?.message ?? 'No se pudo crear el usuario.';
                return of({ success: false as const, message } as ApiResponse<User>);
            })
        );
    }

    deleteUser(userId: string): void {
        this.http.delete<void>(`${this.apiUrl}/api/users/${userId}`).pipe(
            tap(() => SYSTEM_USERS.update(list => list.filter(u => u.id !== userId))),
            catchError(() => of(void 0))
        ).subscribe();
    }

    // ── Privados ───────────────────────────────────────────────────────────────

    private _clearSession(): void {
        localStorage.removeItem(TOKEN_KEY);
        this.currentUser.set(null);
        this.authState.set({ user: null, isAuthenticated: false, token: null, loading: false });
        this.router.navigate(['/login']);
    }

    private _upsertSystemUser(user: User): void {
        SYSTEM_USERS.update(list => {
            const exists = list.some(u => u.id === user.id);
            return exists ? list.map(u => u.id === user.id ? user : u) : [...list, user];
        });
    }

    private _mapDtoToUser(dto: any): User {
        const role = (dto.role ?? dto.roles?.[0]?.name ?? 'user') as AppRole;
        return {
            id:          dto.id,
            username:    dto.username ?? dto.email?.split('@')[0] ?? '',
            name:        dto.name,
            email:       dto.email,
            role,
            permissions: (Array.isArray(dto.permissions) && dto.permissions.length > 0)
                ? dto.permissions
                : (ROLE_DEFAULT_PERMISSIONS[role] ?? []),
            enabled:     dto.isActive ?? dto.enabled ?? dto.is_active ?? true,
            avatarUrl:   dto.avatarUrl ?? dto.avatar_url,
        };
    }
}
