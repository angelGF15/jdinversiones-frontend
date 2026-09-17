import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { permissionGuard } from './permission.guard';
import { AuthState } from '../auth/auth.state';

describe('permissionGuard', () => {
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let router: Router;

  const mockState = { url: '/admin/users' } as RouterStateSnapshot;

  beforeEach(() => {
    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthState, useValue: authStateSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('debe permitir el acceso si la ruta no define requiredPermission', () => {
    const routeWithoutPermission = { data: {} } as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithoutPermission, mockState)
    );

    expect(result).toBeTrue();
    expect(authStateSpy.hasPermission).not.toHaveBeenCalled();
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });

  it('debe permitir el acceso si el usuario posee el permiso requerido', () => {
    authStateSpy.hasPermission.and.returnValue(true);

    const routeWithPermission = {
      data: { requiredPermission: 'USER_VIEW' },
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermission, mockState)
    );

    expect(result).toBeTrue();
    expect(authStateSpy.hasPermission).toHaveBeenCalledWith('USER_VIEW');
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });

  it('debe denegar el acceso, mostrar snackbar y redirigir a /admin si falta el permiso', () => {
    authStateSpy.hasPermission.and.returnValue(false);

    const routeWithPermission = {
      data: { requiredPermission: 'USER_CREATE' },
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeWithPermission, mockState)
    );

    expect(authStateSpy.hasPermission).toHaveBeenCalledWith('USER_CREATE');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'No tienes permiso para acceder a esta sección.',
      'Cerrar',
      jasmine.any(Object)
    );
    expect(result instanceof UrlTree).toBeTrue();
    const urlTree = result as UrlTree;
    expect(router.serializeUrl(urlTree)).toBe('/admin');
  });
});
