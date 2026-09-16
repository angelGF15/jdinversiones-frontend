import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, PLATFORM_ID } from '@angular/core';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { TokenStoreService } from '../auth/token-store.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStore: TokenStoreService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TokenStoreService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStore = TestBed.inject(TokenStoreService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debe adjuntar Authorization: Bearer cuando existe un accessToken', () => {
    tokenStore.setTokens({
      accessToken: 'valid-jwt-token',
      refreshToken: 'refresh-jwt-token',
    });

    http.get('/api/products').subscribe();

    const req = httpMock.expectOne('/api/products');
    expect(req.request.headers.has('Authorization')).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-jwt-token');
    req.flush([]);
  });

  it('no debe adjuntar Authorization si no hay token almacenado', () => {
    http.get('/api/products').subscribe();

    const req = httpMock.expectOne('/api/products');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('no debe adjuntar Authorization en peticiones a /auth/login', () => {
    tokenStore.setTokens({
      accessToken: 'valid-jwt-token',
      refreshToken: 'refresh-jwt-token',
    });

    http.post('/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no debe adjuntar Authorization en peticiones a /auth/refresh', () => {
    tokenStore.setTokens({
      accessToken: 'valid-jwt-token',
      refreshToken: 'refresh-jwt-token',
    });

    http.post('/auth/refresh', {}).subscribe();

    const req = httpMock.expectOne('/auth/refresh');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no debe sobrescribir un header Authorization existente', () => {
    tokenStore.setTokens({
      accessToken: 'store-jwt-token',
      refreshToken: 'refresh-jwt-token',
    });

    http.get('/api/custom', {
      headers: { Authorization: 'Custom-Auth custom-token' },
    }).subscribe();

    const req = httpMock.expectOne('/api/custom');
    expect(req.request.headers.get('Authorization')).toBe('Custom-Auth custom-token');
    req.flush({});
  });

  it('en entorno servidor (SSR) no debe adjuntar Authorization', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TokenStoreService,
        { provide: PLATFORM_ID, useValue: 'server' },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const serverHttp = TestBed.inject(HttpClient);
    const serverHttpMock = TestBed.inject(HttpTestingController);

    serverHttp.get('/api/products').subscribe();

    const req = serverHttpMock.expectOne('/api/products');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
    serverHttpMock.verify();
  });
});
