import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthState } from '../auth/auth.state';

/**
 * Guard funcional que valida si el usuario autenticado posee el permiso requerido
 * especificado en route.data['requiredPermission'].
 *
 * Si el usuario no posee el permiso:
 * 1. Muestra un snackbar notificando: "No tienes permiso para acceder a esta sección."
 * 2. Redirige a la raíz del panel administrativo (/admin) mediante UrlTree.
 *
 * Si la ruta no especifica requiredPermission, permite el acceso libremente (compatibilidad).
 */
export const permissionGuard: CanActivateFn = (route, _state) => {
  const authState = inject(AuthState);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  const requiredPermission = route.data?.['requiredPermission'] as string | undefined;

  if (!requiredPermission) {
    return true;
  }

  if (authState.hasPermission(requiredPermission)) {
    return true;
  }

  snackBar.open('No tienes permiso para acceder a esta sección.', 'Cerrar', {
    duration: 3500,
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
  });

  return router.createUrlTree(['/admin']);
};
