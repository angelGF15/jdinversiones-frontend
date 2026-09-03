import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthState } from '../../../core/auth/auth.state';
import { LoginResponse } from '../../../core/auth/models/auth.models';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let routerSpy: jasmine.SpyObj<Router>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockLoginResponse: LoginResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    profile: {
      userId: 'usr-123',
      entityId: 'ent-123',
      firstName: 'Admin',
      lastName: 'Seed',
      businessName: null,
      email: 'admin@jdinversiones.hn',
      themePreference: 'light',
      lastLoginAt: null,
      roles: ['ADMINISTRADOR'],
      permissions: ['DASHBOARD_VIEW', 'PRODUCT_VIEW'],
    },
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    authStateSpy = jasmine.createSpyObj('AuthState', ['setSession']);
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AuthState, useValue: authStateSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: { returnUrl: '/admin/inventory' },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente con formulario vacío e inválido', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm.valid).toBeFalse();
    expect(component.hidePassword()).toBeTrue();
    expect(component.isSubmitting()).toBeFalse();
    expect(component.errorMessage()).toBeNull();
  });

  it('debe validar el campo email como obligatorio y con formato válido', () => {
    const emailCtrl = component.loginForm.controls.email;

    emailCtrl.setValue('');
    expect(emailCtrl.hasError('required')).toBeTrue();

    emailCtrl.setValue('no-es-correo');
    expect(emailCtrl.hasError('email')).toBeTrue();

    emailCtrl.setValue('valido@jdinversiones.hn');
    expect(emailCtrl.valid).toBeTrue();
  });

  it('debe validar el campo password como obligatorio y con mínimo 8 caracteres', () => {
    const passCtrl = component.loginForm.controls.password;

    passCtrl.setValue('');
    expect(passCtrl.hasError('required')).toBeTrue();

    passCtrl.setValue('1234567');
    expect(passCtrl.hasError('minlength')).toBeTrue();

    passCtrl.setValue('12345678');
    expect(passCtrl.valid).toBeTrue();
  });

  it('debe alternar la visibilidad de la contraseña con togglePasswordVisibility()', () => {
    expect(component.hidePassword()).toBeTrue();
    component.togglePasswordVisibility();
    expect(component.hidePassword()).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.hidePassword()).toBeTrue();
  });

  it('no debe invocar authService.login() si el formulario es inválido al enviar', () => {
    component.onSubmit();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(component.loginForm.controls.email.touched).toBeTrue();
    expect(component.loginForm.controls.password.touched).toBeTrue();
  });

  it('debe autenticar y redirigir al returnUrl tras login exitoso', () => {
    authServiceSpy.login.and.returnValue(of(mockLoginResponse));

    component.loginForm.setValue({
      email: 'admin@jdinversiones.hn',
      password: 'AdminPassword123!',
    });

    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'admin@jdinversiones.hn',
      password: 'AdminPassword123!',
    });
    expect(authStateSpy.setSession).toHaveBeenCalledWith(mockLoginResponse);
    expect(snackBarSpy.open).toHaveBeenCalledWith('¡Bienvenido al sistema!', 'Cerrar', jasmine.any(Object));
    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/admin/inventory');
  });

  it('debe manejar error 401 mostrando mensaje de credenciales inválidas', () => {
    const error401 = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    authServiceSpy.login.and.returnValue(throwError(() => error401));

    component.loginForm.setValue({
      email: 'admin@jdinversiones.hn',
      password: 'WrongPassword123!',
    });

    component.onSubmit();

    expect(component.isSubmitting()).toBeFalse();
    expect(component.errorType()).toBe('credentials');
    expect(component.errorMessage()).toContain('Credenciales inválidas');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringMatching(/Credenciales inválidas/),
      'Cerrar',
      jasmine.any(Object)
    );
  });

  it('debe manejar error 403 de usuario inactivo o suspendido', () => {
    const error403 = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });
    authServiceSpy.login.and.returnValue(throwError(() => error403));

    component.loginForm.setValue({
      email: 'suspendido@jdinversiones.hn',
      password: 'Password123!',
    });

    component.onSubmit();

    expect(component.errorType()).toBe('suspended');
    expect(component.errorMessage()).toContain('inactivo o suspendido');
  });

  it('debe manejar error 429 de límite de intentos (rate limit)', () => {
    const error429 = new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' });
    authServiceSpy.login.and.returnValue(throwError(() => error429));

    component.loginForm.setValue({
      email: 'admin@jdinversiones.hn',
      password: 'Password123!',
    });

    component.onSubmit();

    expect(component.errorType()).toBe('rate-limit');
    expect(component.errorMessage()).toContain('espera 1 minuto');
  });

  it('debe manejar error 400 de formato o DTO inválido', () => {
    const error400 = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });
    authServiceSpy.login.and.returnValue(throwError(() => error400));

    component.loginForm.setValue({
      email: 'admin@jdinversiones.hn',
      password: 'Password123!',
    });

    component.onSubmit();

    expect(component.errorType()).toBe('validation');
    expect(component.errorMessage()).toContain('formato inválido');
  });

  it('debe manejar error de red o de servidor (status 0 / 500)', () => {
    const error0 = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
    authServiceSpy.login.and.returnValue(throwError(() => error0));

    component.loginForm.setValue({
      email: 'admin@jdinversiones.hn',
      password: 'Password123!',
    });

    component.onSubmit();

    expect(component.errorType()).toBe('network');
    expect(component.errorMessage()).toContain('Error de conexión');
  });
});
