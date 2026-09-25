import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { TokenStoreService } from './token-store.service';
import { Profile } from './models/auth.models';

describe('TokenStoreService', () => {
  let service: TokenStoreService;

  const mockProfile: Profile = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    entityId: '123e4567-e89b-12d3-a456-426614174001',
    firstName: 'Juan',
    lastName: 'Pérez',
    businessName: null,
    email: 'admin@jdinversiones.com',
    avatarUrl: null,
    themePreference: 'light',
    lastLoginAt: '2026-09-02T12:00:00.000Z',
    roles: ['ADMINISTRADOR'],
    permissions: ['DASHBOARD_VIEW', 'PRODUCT_VIEW'],
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TokenStoreService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(TokenStoreService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe almacenar y recuperar el par de tokens correctamente', () => {
    service.setTokens({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    });

    expect(service.getAccessToken()).toBe('test-access-token');
    expect(service.getRefreshToken()).toBe('test-refresh-token');

    const tokens = service.getTokens();
    expect(tokens).toEqual({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    });
    expect(service.hasTokens()).toBeTrue();
  });

  it('debe emitir cambios en accessToken$', (done) => {
    service.accessToken$.subscribe((token) => {
      if (token === 'test-access-token') {
        expect(token).toBe('test-access-token');
        done();
      }
    });

    service.setTokens({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    });
  });

  it('debe guardar y recuperar el perfil del usuario', () => {
    service.saveProfile(mockProfile);

    const stored = service.getStoredProfile();
    expect(stored).toEqual(mockProfile);
  });

  it('debe limpiar tokens y perfil al llamar a clear()', () => {
    service.setTokens({
      accessToken: 'token-to-clear',
      refreshToken: 'refresh-to-clear',
    });
    service.saveProfile(mockProfile);

    service.clear();

    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getTokens()).toBeNull();
    expect(service.getStoredProfile()).toBeNull();
    expect(service.hasTokens()).toBeFalse();
  });

  it('en entorno servidor (SSR) no debe fallar y debe retornar null', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TokenStoreService,
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    const serverService = TestBed.inject(TokenStoreService);

    expect(serverService.getTokens()).toBeNull();
    expect(serverService.getAccessToken()).toBeNull();
    expect(serverService.getRefreshToken()).toBeNull();
    expect(serverService.getStoredProfile()).toBeNull();
    expect(serverService.hasTokens()).toBeFalse();

    // No debe lanzar errores
    expect(() => {
      serverService.setTokens({ accessToken: 'a', refreshToken: 'b' });
      serverService.saveProfile(mockProfile);
      serverService.clear();
    }).not.toThrow();
  });
});
