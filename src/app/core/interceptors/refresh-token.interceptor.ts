import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, throwError, catchError, switchMap, map, finalize, shareReplay } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthState } from '../auth/auth.state';
import { TokenStoreService } from '../auth/token-store.service';

/**
 * Encabezado interno para marcar una petición que ya fue reintentada con un nuevo token.
 * Evita bucles si un endpoint sigue respondiendo 401 aun con credenciales frescas.
 */
const RETRY_HEADER = 'X-JD-Refresh-Retried';

/**
 * Referencia compartida al flujo de refresco en curso.
 * Garantiza que múltiples peticiones concurrentes con 401 se encolen y compartan
 * una única llamada a /auth/refresh.
 */
let ongoingRefresh$: Observable<string> | null = null;

/**
 * Interceptor que captura respuestas HTTP 401 (Unauthorized) y ejecuta automáticamente
 * la rotación del par de tokens (accessToken y refreshToken) sin interrumpir la experiencia
 * del usuario.
 * 
 * Excluye peticiones a /auth/login y /auth/refresh para no interferir con validaciones
 * de credenciales ni crear bucles de refresco.
 */
export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const authState = inject(AuthState);
  const tokenStore = inject(TokenStoreService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      // Si no es un error HTTP o no estamos en el navegador, propagar de inmediato
      if (!(error instanceof HttpErrorResponse) || !isPlatformBrowser(platformId)) {
        return throwError(() => error);
      }

      // Solo interceptar errores 401
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Excluir endpoints de auth para permitir que la UI maneje errores como "Credenciales inválidas"
      // y para evitar bucles si el propio /auth/refresh retorna 401
      if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      // Si la petición ya fue reintentada una vez con un token nuevo y volvió a fallar 401,
      // cerrar sesión inmediatamente para evitar bucles
      if (req.headers.has(RETRY_HEADER)) {
        authState.clearSession();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) {
        // No hay refresh token disponible: sesión caducada
        authState.clearSession();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      // Si no hay un refresco en curso, iniciar uno nuevo compartido
      if (!ongoingRefresh$) {
        ongoingRefresh$ = authService.refresh(refreshToken).pipe(
          map((response) => {
            // Sobrescribir ambos tokens (rotativo) y perfil si viene incluido
            authState.updateTokens({
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
            });
            if (response.profile) {
              authState.setProfile(response.profile);
            }
            return response.accessToken;
          }),
          catchError((refreshError) => {
            // Si el refresh falla (expirado, inválido), limpiar todo y redirigir
            authState.clearSession();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
          finalize(() => {
            ongoingRefresh$ = null;
          }),
          shareReplay(1)
        );
      }

      // Reintentar la petición original con el nuevo access token
      return ongoingRefresh$.pipe(
        switchMap((newAccessToken) => {
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
              [RETRY_HEADER]: 'true',
            },
          });
          return next(retryReq);
        })
      );
    })
  );
};
