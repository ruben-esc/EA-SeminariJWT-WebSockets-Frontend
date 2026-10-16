import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = `${environment.apiUrl}/auth`;

  // El access token ahora vive estrictamente en memoria (Signal)
  readonly accessToken = signal<string | null>(null);

  // El usuario con sesión. Al quitar localStorage, empieza en null.
  private currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();

  // computed: se recalculan solos cada vez que cambian las signals de las que dependen
  readonly isLoggedIn = computed(() => this.accessToken() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  /** POST /auth/register. No inicia sesión: la API no devuelve token y hay que hacer login */
  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, data);
  }

  /** POST /auth/login. Guarda el access token y el usuario en memoria */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials, {
      withCredentials: true // OBLIGATORIO: Permite al navegador guardar la cookie HttpOnly
    }).pipe(
      tap((response) => {
        this.accessToken.set(response.token);
        this.currentUser.set(response.user);
      }),
    );
  }

  /** POST /auth/refresh. Pide un access token nuevo enviando la cookie HttpOnly */
  refresh(): Observable<string> {
    return this.http.post<RefreshResponse>(`${this.baseUrl}/refresh`, {}, {
      withCredentials: true 
    }).pipe(
      tap((response) => {
        this.accessToken.set(response.token);

        // Decodificamos el payload del JWT para recuperar el usuario y su rol
        try {
          const payloadBase64 = response.token.split('.')[1];
          const payloadJson = atob(payloadBase64);
          const decoded = JSON.parse(payloadJson);

          // Ajusta los campos según lo que guarde tu JWT en el backend (ej. decoded.user, o decoded.id, decoded.role...)
          const user: User = decoded.user ?? {
            id: decoded.id ?? decoded.sub,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name ?? decoded.email?.split('@')[0]
          };

          this.currentUser.set(user);
        } catch (e) {
          console.error('Error al decodificar el token:', e);
        }
      }),
      map((response) => response.token),
    );
  }

  /** Cierra la sesión: avisa al backend para borrar la cookie y limpia la memoria */
  logout(): void {
    // Avisamos al backend para que haga el res.clearCookie()
    this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => this.clearSession(),
      error: () => this.clearSession() // Aunque falle la red, limpiamos el frontend
    });
  }

  /** Función auxiliar para limpiar las signals y navegar al login */
  private clearSession(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /** El access token guardado, o null si no hay sesión. Lo usa el interceptor */
  getToken(): string | null {
    return this.accessToken();
  }
}