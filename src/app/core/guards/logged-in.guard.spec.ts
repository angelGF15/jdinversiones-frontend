import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { loggedInGuard } from './logged-in.guard';
import { AuthState } from '../auth/auth.state';

describe('loggedInGuard', () => {
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let router: Router;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/login' } as RouterStateSnapshot;

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

  it('debe redirigir a /admin si el usuario ya está autenticado', () => {
    authStateSpy.isAuthenticated.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => loggedInGuard(mockRoute, mockState));

    expect(result instanceof UrlTree).toBeTrue();
    const urlTree = result as UrlTree;
    expect(router.serializeUrl(urlTree)).toBe('/admin');
  });

  it('debe permitir la navegación a /login si el usuario no está autenticado', () => {
    authStateSpy.isAuthenticated.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => loggedInGuard(mockRoute, mockState));

    expect(result).toBeTrue();
  });
});
