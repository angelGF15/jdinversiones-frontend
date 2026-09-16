import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthState } from '../auth/auth.state';

describe('authGuard', () => {
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let router: Router;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/admin/products' } as RouterStateSnapshot;

  beforeEach(() => {
    authStateSpy = jasmine.createSpyObj('AuthState', ['isAuthenticated']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthState, useValue: authStateSpy },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('debe permitir la navegación si el usuario está autenticado', () => {
    authStateSpy.isAuthenticated.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBeTrue();
  });

  it('debe redirigir a /login con returnUrl si no está autenticado', () => {
    authStateSpy.isAuthenticated.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result instanceof UrlTree).toBeTrue();
    const urlTree = result as UrlTree;
    expect(urlTree.queryParams['returnUrl']).toBe('/admin/products');
    expect(router.serializeUrl(urlTree)).toContain('/login?returnUrl=%2Fadmin%2Fproducts');
  });
});
