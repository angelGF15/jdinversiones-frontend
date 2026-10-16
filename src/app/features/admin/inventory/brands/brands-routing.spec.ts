import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Route } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { routes } from '../../../../app.routes';
import { permissionGuard } from '../../../../core/guards/permission.guard';
import { AuthState } from '../../../../core/auth/auth.state';
import { BrandsListComponent } from './brands-list/brands-list.component';

describe('Brands Routing & RBAC Protection', () => {
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let router: Router;

  const mockState = { url: '/admin/inventory/brands' } as RouterStateSnapshot;

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

  function findBrandsRoute(): Route | undefined {
    const adminRoute = routes.find((r) => r.path === 'admin');
    return adminRoute?.children?.find((r) => r.path === 'inventory/brands');
  }

  it('debe registrar la ruta "inventory/brands" bajo el shell de administración', () => {
    const brandsRoute = findBrandsRoute();
    expect(brandsRoute).toBeDefined();
    expect(brandsRoute?.path).toBe('inventory/brands');
  });

  it('debe proteger la ruta con permissionGuard y exigir permiso BRAND_VIEW', () => {
    const brandsRoute = findBrandsRoute();
    expect(brandsRoute?.canActivate).toContain(permissionGuard);
    expect(brandsRoute?.data?.['requiredPermission']).toBe('BRAND_VIEW');
  });

  it('debe cargar de forma perezosa (lazy) BrandsListComponent', async () => {
    const brandsRoute = findBrandsRoute();
    expect(brandsRoute?.loadComponent).toBeDefined();

    if (brandsRoute?.loadComponent) {
      const loaded = await (brandsRoute.loadComponent() as Promise<any>);
      expect(loaded).toBe(BrandsListComponent);
    }
  });

  it('debe permitir la navegación a la ruta cuando el usuario posee BRAND_VIEW', () => {
    authStateSpy.hasPermission.and.returnValue(true);

    const brandsRoute = findBrandsRoute();
    const routeSnapshot = {
      data: brandsRoute?.data ?? {},
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeSnapshot, mockState)
    );

    expect(result).toBeTrue();
    expect(authStateSpy.hasPermission).toHaveBeenCalledWith('BRAND_VIEW');
    expect(snackBarSpy.open).not.toHaveBeenCalled();
  });

  it('debe bloquear la navegación y redirigir a /admin si el usuario carece de BRAND_VIEW', () => {
    authStateSpy.hasPermission.and.returnValue(false);

    const brandsRoute = findBrandsRoute();
    const routeSnapshot = {
      data: brandsRoute?.data ?? {},
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(routeSnapshot, mockState)
    );

    expect(authStateSpy.hasPermission).toHaveBeenCalledWith('BRAND_VIEW');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'No tienes permiso para acceder a esta sección.',
      'Cerrar',
      jasmine.any(Object)
    );
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/admin');
  });
});
