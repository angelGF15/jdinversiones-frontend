import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TokenStoreService } from '../auth/token-store.service';

/**
 * Interceptor que adjunta el encabezado 'Authorization: Bearer <token>' a las peticiones
 * HTTP salientes cuando existe un accessToken disponible en el navegador.
 * 
 * Excluye endpoints públicos de autenticación (/auth/login, /auth/refresh)
 * y peticiones que ya incluyan un encabezado de autorización explícito.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // En entorno servidor (SSR) o si ya tiene Authorization, dejar pasar
  if (!isPlatformBrowser(platformId) || req.headers.has('Authorization')) {
    return next(req);
  }

  // Omitir endpoints públicos de autenticación
  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const tokenStore = inject(TokenStoreService);
  const accessToken = tokenStore.getAccessToken();

  if (accessToken) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return next(clonedReq);
  }

  return next(req);
};
