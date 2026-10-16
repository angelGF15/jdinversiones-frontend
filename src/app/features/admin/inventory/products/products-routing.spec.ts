import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Route } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { routes } from '../../../../app.routes';
import { permissionGuard } from '../../../../core/guards/permission.guard';
import { AuthState } from '../../../../core/auth/auth.state';
import { ProductsListComponent } from './products-list/products-list.component';
import { ProductFormComponent } from './product-form/product-form.component';

describe('Products Routing & RBAC Protection', () => {
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let router: Router;

  const mockState = { url: '/admin/inventory/products' } as RouterStateSnapshot;

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

  function findProductRoute(path: string): Route | undefined {
    const adminRoute = routes.find((r) => r.path === 'admin');
    return adminRoute?.children?.find((r) => r.path === path);
  }

  describe('Route: inventory/products (Listado)', () => {
    it('debe registrar la ruta "inventory/products" bajo el shell de administración', () => {
      const route = findProductRoute('inventory/products');
      expect(route).toBeDefined();
      expect(route?.path).toBe('inventory/products');
    });

    it('debe proteger la ruta con permissionGuard y exigir permiso PRODUCT_VIEW', () => {
      const route = findProductRoute('inventory/products');
      expect(route?.canActivate).toContain(permissionGuard);
      expect(route?.data?.['requiredPermission']).toBe('PRODUCT_VIEW');
    });

    it('debe cargar de forma perezosa (lazy) ProductsListComponent', async () => {
      const route = findProductRoute('inventory/products');
      expect(route?.loadComponent).toBeDefined();

      if (route?.loadComponent) {
        const loaded = await (route.loadComponent() as Promise<any>);
        expect(loaded).toBe(ProductsListComponent);
      }
    });

    it('debe permitir la navegación cuando el usuario posee PRODUCT_VIEW', () => {
      authStateSpy.hasPermission.and.returnValue(true);

      const route = findProductRoute('inventory/products');
      const routeSnapshot = {
        data: route?.data ?? {},
      } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        permissionGuard(routeSnapshot, mockState)
      );

      expect(result).toBeTrue();
      expect(authStateSpy.hasPermission).toHaveBeenCalledWith('PRODUCT_VIEW');
      expect(snackBarSpy.open).not.toHaveBeenCalled();
    });

    it('debe bloquear la navegación y redirigir a /admin si el usuario carece de PRODUCT_VIEW', () => {
      authStateSpy.hasPermission.and.returnValue(false);

      const route = findProductRoute('inventory/products');
      const routeSnapshot = {
        data: route?.data ?? {},
      } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        permissionGuard(routeSnapshot, mockState)
      );

      expect(authStateSpy.hasPermission).toHaveBeenCalledWith('PRODUCT_VIEW');
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'No tienes permiso para acceder a esta sección.',
        'Cerrar',
        jasmine.any(Object)
      );
      expect(result instanceof UrlTree).toBeTrue();
      expect(router.serializeUrl(result as UrlTree)).toBe('/admin');
    });
  });

  describe('Route: inventory/products/new (Creación)', () => {
    it('debe registrar la ruta "inventory/products/new" bajo el shell de administración', () => {
      const route = findProductRoute('inventory/products/new');
      expect(route).toBeDefined();
      expect(route?.path).toBe('inventory/products/new');
    });

    it('debe proteger la ruta con permissionGuard y exigir permiso PRODUCT_CREATE', () => {
      const route = findProductRoute('inventory/products/new');
      expect(route?.canActivate).toContain(permissionGuard);
      expect(route?.data?.['requiredPermission']).toBe('PRODUCT_CREATE');
    });

    it('debe cargar de forma perezosa (lazy) ProductFormComponent', async () => {
      const route = findProductRoute('inventory/products/new');
      expect(route?.loadComponent).toBeDefined();

      if (route?.loadComponent) {
        const loaded = await (route.loadComponent() as Promise<any>);
        expect(loaded).toBe(ProductFormComponent);
      }
    });

    it('debe permitir la navegación cuando el usuario posee PRODUCT_CREATE', () => {
      authStateSpy.hasPermission.and.returnValue(true);

      const route = findProductRoute('inventory/products/new');
      const routeSnapshot = {
        data: route?.data ?? {},
      } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        permissionGuard(routeSnapshot, mockState)
      );

      expect(result).toBeTrue();
      expect(authStateSpy.hasPermission).toHaveBeenCalledWith('PRODUCT_CREATE');
      expect(snackBarSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('Route: inventory/products/:id/edit (Edición)', () => {
    it('debe registrar la ruta "inventory/products/:id/edit" bajo el shell de administración', () => {
      const route = findProductRoute('inventory/products/:id/edit');
      expect(route).toBeDefined();
      expect(route?.path).toBe('inventory/products/:id/edit');
    });

    it('debe proteger la ruta con permissionGuard y exigir permiso PRODUCT_EDIT', () => {
      const route = findProductRoute('inventory/products/:id/edit');
      expect(route?.canActivate).toContain(permissionGuard);
      expect(route?.data?.['requiredPermission']).toBe('PRODUCT_EDIT');
    });

    it('debe cargar de forma perezosa (lazy) ProductFormComponent', async () => {
      const route = findProductRoute('inventory/products/:id/edit');
      expect(route?.loadComponent).toBeDefined();

      if (route?.loadComponent) {
        const loaded = await (route.loadComponent() as Promise<any>);
        expect(loaded).toBe(ProductFormComponent);
      }
    });

    it('debe permitir la navegación cuando el usuario posee PRODUCT_EDIT', () => {
      authStateSpy.hasPermission.and.returnValue(true);

      const route = findProductRoute('inventory/products/:id/edit');
      const routeSnapshot = {
        data: route?.data ?? {},
      } as unknown as ActivatedRouteSnapshot;

      const result = TestBed.runInInjectionContext(() =>
        permissionGuard(routeSnapshot, mockState)
      );

      expect(result).toBeTrue();
      expect(authStateSpy.hasPermission).toHaveBeenCalledWith('PRODUCT_EDIT');
      expect(snackBarSpy.open).not.toHaveBeenCalled();
    });
  });
});
