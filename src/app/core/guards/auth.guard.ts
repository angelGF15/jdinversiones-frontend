import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthState } from '../auth/auth.state';

/**
 * Guard funcional que protege las rutas del Panel Administrativo (/admin/*).
 * Si el usuario no tiene una sesión activa, cancela la navegación y redirige
 * a /login preservando la ruta original solicitada en queryParams.returnUrl.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
