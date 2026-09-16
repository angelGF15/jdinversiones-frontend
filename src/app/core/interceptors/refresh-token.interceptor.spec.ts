import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { provideHttpClient, withInterceptors, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { refreshTokenInterceptor } from './refresh-token.interceptor';
import { AuthService } from '../auth/auth.service';
import { AuthState } from '../auth/auth.state';
import { TokenStoreService } from '../auth/token-store.service';
import { LoginResponse, Profile } from '../auth/models/auth.models';
import { environment } from '../../../environments/environment';

describe('refreshTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authState: AuthState;
  let tokenStore: TokenStoreService;
  let routerSpy: jasmine.SpyObj<Router>;

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

  const mockNewTokens: LoginResponse = {
    accessToken: 'new-refreshed-access-token',
    refreshToken: 'new-refreshed-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    profile: mockProfile,
  };

  beforeEach(() => {
    localStorage.clear();
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TokenStoreService,
        AuthService,
        AuthState,
        { provide: Router, useValue: routerSpy },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideHttpClient(withInterceptors([refreshTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authState = TestBed.inject(AuthState);
    tokenStore = TestBed.inject(TokenStoreService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debe permitir el flujo normal si la respuesta es exitosa (200 OK)', () => {
    http.get('/api/orders').subscribe((res) => {
      expect(res).toEqual({ count: 5 });
    });

    const req = httpMock.expectOne('/api/orders');
    req.flush({ count: 5 });
  });

  it('no debe interceptar ni refrescar cuando /auth/login retorna 401', () => {
    let errorResponse: HttpErrorResponse | undefined;

    http.post('/auth/login', { email: 'wrong', password: 'bad' }).subscribe({
      next: () => fail('debió fallar'),
      error: (err) => (errorResponse = err),
    });

    const req = httpMock.expectOne('/auth/login');
    req.flush('Credenciales inválidas', { status: 401, statusText: 'Unauthorized' });

    expect(errorResponse).toBeDefined();
    expect(errorResponse?.status).toBe(401);
    // No debe llamar a /auth/refresh
    httpMock.expectNone(`${apiUrl}/auth/refresh`);
  });

  it('no debe interceptar cuando el propio /auth/refresh retorna 401', () => {
    let errorResponse: HttpErrorResponse | undefined;

    http.post('/auth/refresh', { refreshToken: 'expired' }).subscribe({
      next: () => fail('debió fallar'),
      error: (err) => (errorResponse = err),
    });

    const req = httpMock.expectOne('/auth/refresh');
    req.flush('Refresh token vencido', { status: 401, statusText: 'Unauthorized' });

    expect(errorResponse).toBeDefined();
    expect(errorResponse?.status).toBe(401);
  });

  it('ante 401 en endpoint protegido, debe ejecutar refresh y reintentar con nuevo token', () => {
    tokenStore.setTokens({
      accessToken: 'old-expired-token',
      refreshToken: 'valid-refresh-token',
    });

    let successData: unknown;
    http.get('/api/products').subscribe((data) => {
      successData = data;
    });

    // 1. Petición original falla con 401
    const initialReq = httpMock.expectOne('/api/products');
    initialReq.flush('Token expired', { status: 401, statusText: 'Unauthorized' });

    // 2. Interceptor detecta 401 y llama a /auth/refresh
    const refreshReq = httpMock.expectOne(`${apiUrl}/auth/refresh`);
    expect(refreshReq.request.method).toBe('POST');
    expect(refreshReq.request.body).toEqual({ refreshToken: 'valid-refresh-token' });
    refreshReq.flush(mockNewTokens);

    // 3. Tokens deben haberse actualizado en el store
    expect(tokenStore.getAccessToken()).toBe('new-refreshed-access-token');
    expect(tokenStore.getRefreshToken()).toBe('new-refreshed-refresh-token');

    // 4. Petición original es reintentada con el nuevo Bearer token
    const retryReq = httpMock.expectOne('/api/products');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-refreshed-access-token');
    expect(retryReq.request.headers.get('X-JD-Refresh-Retried')).toBe('true');
    retryReq.flush([{ id: 1, name: 'Laptop' }]);

    expect(successData).toEqual([{ id: 1, name: 'Laptop' }]);
  });

  it('ante múltiples peticiones 401 concurrentes, solo debe realizar UNA llamada a /auth/refresh y reintentar todas', () => {
    tokenStore.setTokens({
      accessToken: 'old-expired-token',
      refreshToken: 'valid-refresh-token',
    });

    let data1: unknown;
    let data2: unknown;
    let data3: unknown;

    http.get('/api/resource-1').subscribe((d) => (data1 = d));
    http.get('/api/resource-2').subscribe((d) => (data2 = d));
    http.get('/api/resource-3').subscribe((d) => (data3 = d));

    // Las tres peticiones fallan casi simultáneamente con 401
    const req1 = httpMock.expectOne('/api/resource-1');
    const req2 = httpMock.expectOne('/api/resource-2');
    const req3 = httpMock.expectOne('/api/resource-3');

    req1.flush('Expired', { status: 401, statusText: 'Unauthorized' });
    req2.flush('Expired', { status: 401, statusText: 'Unauthorized' });
    req3.flush('Expired', { status: 401, statusText: 'Unauthorized' });

    // Solo DEBE haber UNA llamada a /auth/refresh
    const refreshReq = httpMock.expectOne(`${apiUrl}/auth/refresh`);
    refreshReq.flush(mockNewTokens);

    // Las tres peticiones son reintentadas con el nuevo token
    const retry1 = httpMock.expectOne('/api/resource-1');
    const retry2 = httpMock.expectOne('/api/resource-2');
    const retry3 = httpMock.expectOne('/api/resource-3');

    expect(retry1.request.headers.get('Authorization')).toBe('Bearer new-refreshed-access-token');
    expect(retry2.request.headers.get('Authorization')).toBe('Bearer new-refreshed-access-token');
    expect(retry3.request.headers.get('Authorization')).toBe('Bearer new-refreshed-access-token');

    retry1.flush({ res: 1 });
    retry2.flush({ res: 2 });
    retry3.flush({ res: 3 });

    expect(data1).toEqual({ res: 1 });
    expect(data2).toEqual({ res: 2 });
    expect(data3).toEqual({ res: 3 });
  });

  it('si el refresh falla, debe limpiar la sesión, redirigir a /login y propagar el error', () => {
    tokenStore.setTokens({
      accessToken: 'old-expired-token',
      refreshToken: 'invalid-refresh-token',
    });
    tokenStore.saveProfile(mockProfile);

    let caughtError: unknown;
    http.get('/api/dashboard').subscribe({
      next: () => fail('debió fallar'),
      error: (err) => (caughtError = err),
    });

    const initialReq = httpMock.expectOne('/api/dashboard');
    initialReq.flush('Expired', { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne(`${apiUrl}/auth/refresh`);
    refreshReq.flush('Refresh Token Revoked', { status: 401, statusText: 'Unauthorized' });

    expect(caughtError).toBeDefined();
    expect(tokenStore.hasTokens()).toBeFalse();
    expect(authState.isAuthenticated()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('si no existe refresh token almacenado ante 401, debe limpiar sesión y redirigir a /login', () => {
    // No hay tokens
    let caughtError: unknown;
    http.get('/api/profile').subscribe({
      next: () => fail('debió fallar'),
      error: (err) => (caughtError = err),
    });

    const initialReq = httpMock.expectOne('/api/profile');
    initialReq.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone(`${apiUrl}/auth/refresh`);
    expect(caughtError).toBeDefined();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
