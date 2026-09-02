import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { AuthState } from './auth.state';
import { TokenStoreService } from './token-store.service';
import { LoginResponse, Profile } from './models/auth.models';

describe('AuthState', () => {
  let state: AuthState;
  let tokenStore: TokenStoreService;

  const mockProfile: Profile = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    entityId: '123e4567-e89b-12d3-a456-426614174001',
    firstName: 'Carlos',
    lastName: 'Gómez',
    businessName: 'JD Inversiones S.A.',
    email: 'carlos@jdinversiones.com',
    themePreference: 'dark',
    lastLoginAt: '2026-09-02T10:00:00.000Z',
    roles: ['ADMINISTRADOR', 'VENDEDOR'],
    permissions: ['DASHBOARD_VIEW', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'SALE_VIEW'],
  };

  const mockLoginResponse: LoginResponse = {
    accessToken: 'access-jwt-sample',
    refreshToken: 'refresh-jwt-sample',
    tokenType: 'Bearer',
    expiresIn: 900,
    profile: mockProfile,
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TokenStoreService,
        AuthState,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    tokenStore = TestBed.inject(TokenStoreService);
    state = TestBed.inject(AuthState);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe inicializarse sin sesión activa', () => {
    expect(state.isAuthenticated()).toBeFalse();
    expect(state.profile()).toBeNull();
    expect(state.roles()).toEqual([]);
    expect(state.permissions()).toEqual([]);
    expect(state.fullName()).toBe('');
    expect(state.userEmail()).toBe('');
  });

  it('setSession() debe guardar tokens y actualizar profile y signals computados', () => {
    state.setSession(mockLoginResponse);

    expect(state.isAuthenticated()).toBeTrue();
    expect(state.profile()).toEqual(mockProfile);
    expect(state.roles()).toEqual(['ADMINISTRADOR', 'VENDEDOR']);
    expect(state.permissions()).toContain('DASHBOARD_VIEW');
    expect(state.fullName()).toBe('Carlos Gómez');
    expect(state.userEmail()).toBe('carlos@jdinversiones.com');
    expect(tokenStore.getAccessToken()).toBe('access-jwt-sample');
    expect(tokenStore.getRefreshToken()).toBe('refresh-jwt-sample');
  });

  it('clearSession() debe limpiar el almacenamiento y reiniciar signals', () => {
    state.setSession(mockLoginResponse);
    expect(state.isAuthenticated()).toBeTrue();

    state.clearSession();

    expect(state.isAuthenticated()).toBeFalse();
    expect(state.profile()).toBeNull();
    expect(state.roles()).toEqual([]);
    expect(state.permissions()).toEqual([]);
    expect(tokenStore.hasTokens()).toBeFalse();
  });

  it('hasRole() debe verificar correctamente la presencia de roles', () => {
    state.setSession(mockLoginResponse);

    expect(state.hasRole('ADMINISTRADOR')).toBeTrue();
    expect(state.hasRole('VENDEDOR')).toBeTrue();
    expect(state.hasRole('CLIENTE')).toBeFalse();
  });

  it('hasPermission() debe verificar correctamente permisos individuales', () => {
    state.setSession(mockLoginResponse);

    expect(state.hasPermission('DASHBOARD_VIEW')).toBeTrue();
    expect(state.hasPermission('PRODUCT_CREATE')).toBeTrue();
    expect(state.hasPermission('USER_DELETE')).toBeFalse();
  });

  it('hasAnyPermission() debe retornar true si posee al menos uno de los permisos', () => {
    state.setSession(mockLoginResponse);

    expect(state.hasAnyPermission(['USER_DELETE', 'PRODUCT_VIEW'])).toBeTrue();
    expect(state.hasAnyPermission(['USER_DELETE', 'REPORT_EXPORT'])).toBeFalse();
    expect(state.hasAnyPermission([])).toBeTrue();
  });

  it('hasAllPermissions() debe retornar true solo si posee todos los permisos indicados', () => {
    state.setSession(mockLoginResponse);

    expect(state.hasAllPermissions(['DASHBOARD_VIEW', 'PRODUCT_VIEW'])).toBeTrue();
    expect(state.hasAllPermissions(['DASHBOARD_VIEW', 'USER_DELETE'])).toBeFalse();
    expect(state.hasAllPermissions([])).toBeTrue();
  });

  it('hydrateFromStorage() debe recuperar perfil y tokens previamente guardados', () => {
    tokenStore.setTokens({
      accessToken: 'existing-access',
      refreshToken: 'existing-refresh',
    });
    tokenStore.saveProfile(mockProfile);

    // Creamos una nueva instancia dentro del contexto de inyección que ejecutará hydrateFromStorage
    const newState = TestBed.runInInjectionContext(() => new AuthState());
    expect(newState.isAuthenticated()).toBeTrue();
    expect(newState.profile()).toEqual(mockProfile);
    expect(newState.fullName()).toBe('Carlos Gómez');
  });
});
