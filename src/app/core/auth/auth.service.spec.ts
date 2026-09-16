import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { LoginRequest, LoginResponse, Profile } from './models/auth.models';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  const mockProfile: Profile = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    entityId: '123e4567-e89b-12d3-a456-426614174001',
    firstName: 'Juan',
    lastName: 'Pérez',
    businessName: null,
    email: 'admin@jdinversiones.com',
    themePreference: 'light',
    lastLoginAt: '2026-09-02T12:00:00.000Z',
    roles: ['ADMINISTRADOR'],
    permissions: ['DASHBOARD_VIEW'],
  };

  const mockLoginResponse: LoginResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    profile: mockProfile,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('login() debe realizar petición POST a /auth/login y retornar LoginResponse', () => {
    const credentials: LoginRequest = {
      email: 'admin@jdinversiones.com',
      password: 'password123',
    };

    service.login(credentials).subscribe((res) => {
      expect(res).toEqual(mockLoginResponse);
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);

    req.flush(mockLoginResponse);
  });

  it('refresh() debe realizar petición POST a /auth/refresh con refreshToken', () => {
    service.refresh('current-refresh-token').subscribe((res) => {
      expect(res).toEqual(mockLoginResponse);
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'current-refresh-token' });

    req.flush(mockLoginResponse);
  });

  it('logout() debe realizar petición POST a /auth/logout', () => {
    service.logout().subscribe((res) => {
      expect(res).toBeUndefined();
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');

    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('logout() debe emitir void incluso si el servidor responde con error (stateless)', () => {
    service.logout().subscribe((res) => {
      expect(res).toBeUndefined();
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/logout`);
    req.flush('Error de red', { status: 500, statusText: 'Internal Server Error' });
  });

  it('me() debe realizar petición GET a /auth/me y retornar el perfil', () => {
    service.me().subscribe((profile) => {
      expect(profile).toEqual(mockProfile);
    });

    const req = httpMock.expectOne(`${apiUrl}/auth/me`);
    expect(req.request.method).toBe('GET');

    req.flush(mockProfile);
  });
});
