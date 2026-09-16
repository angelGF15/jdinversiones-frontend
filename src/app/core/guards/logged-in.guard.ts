import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthState } from '../auth/auth.state';

/**
 * Guard funcional para la ruta de acceso (/login).
 * Si el usuario ya posee una sesión activa, impide ver nuevamente la pantalla de login
 * y lo redirige automáticamente al Panel Administrativo (/admin).
 */
export const loggedInGuard: CanActivateFn = () => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return router.createUrlTree(['/admin']);
  }

  return true;
};
