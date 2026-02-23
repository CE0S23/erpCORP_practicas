import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {
    ApiResponse,
    AuthState,
    LoginRequest,
    RegisterRequest,
    User,
} from '../models/user.model';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:3000/api';

    private readonly initialState: AuthState = {
        user: null,
        isAuthenticated: false,
        token: null,
    };

    private readonly authState$ = new BehaviorSubject<AuthState>(this.initialState);

    readonly authState: Observable<AuthState> = this.authState$.asObservable();

    get currentUser(): User | null {
        return this.authState$.value.user;
    }

    get isAuthenticated(): boolean {
        return this.authState$.value.isAuthenticated;
    }

    login(credentials: LoginRequest): Observable<ApiResponse<User>> {
        return this.http
            .post<ApiResponse<User>>(`${this.apiUrl}/login`, credentials)
            .pipe(
                tap((response) => {
                    if (response.success && response.data) {
                        this.authState$.next({
                            user: response.data,
                            isAuthenticated: true,
                            token: `mock-token-${response.data.id}`,
                        });
                    }
                })
            );
    }

    register(userData: RegisterRequest): Observable<ApiResponse<User>> {
        return this.http
            .post<ApiResponse<User>>(`${this.apiUrl}/register`, userData)
            .pipe(
                tap((response) => {
                    if (response.success && response.data) {
                        this.authState$.next({
                            user: response.data,
                            isAuthenticated: true,
                            token: `mock-token-${response.data.id}`,
                        });
                    }
                })
            );
    }

    logout(): void {
        this.authState$.next(this.initialState);
    }
}
