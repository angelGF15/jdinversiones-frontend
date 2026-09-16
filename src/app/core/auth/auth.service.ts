import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  Profile,
  RefreshRequest,
} from './models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Autentica al usuario en el sistema.
   * Endpoint público (rate limit 5/min).
   */
  public login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials);
  }

  /**
   * Renueva el par de tokens (accessToken y refreshToken rotativo) usando el refreshToken vigente.
   * Endpoint público (rate limit 5/min).
   */
  public refresh(refreshToken: string): Observable<LoginResponse> {
    const payload: RefreshRequest = { refreshToken };
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/refresh`, payload);
  }

  /**
   * Cierra la sesión en el backend (stateless).
   * Si la petición falla o no hay conexión, se captura el error y se emite void para permitir
   * que el frontend descarte siempre los tokens locales sin bloquear al usuario.
   */
  public logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {}).pipe(
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  /**
   * Obtiene el perfil actualizado con roles y permisos vigentes del usuario actual.
   * Requiere token Bearer (manejado por interceptor).
   */
  public me(): Observable<Profile> {
    return this.http.get<Profile>(`${this.apiUrl}/auth/me`);
  }
}
