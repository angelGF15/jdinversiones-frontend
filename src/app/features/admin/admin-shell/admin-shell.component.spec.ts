import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AdminShellComponent } from './admin-shell.component';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthState } from '../../../core/auth/auth.state';

describe('AdminShellComponent', () => {
  let component: AdminShellComponent;
  let fixture: ComponentFixture<AdminShellComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let router: Router;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);
    authServiceSpy.logout.and.returnValue(of(void 0));

    authStateSpy = jasmine.createSpyObj('AuthState', [
      'clearSession',
      'hasPermission',
      'hasAnyPermission',
    ]);
    // Definir signals para authState
    Object.defineProperty(authStateSpy, 'fullName', { value: signal('Admin Seed') });
    Object.defineProperty(authStateSpy, 'userEmail', { value: signal('admin@jdinversiones.hn') });
    Object.defineProperty(authStateSpy, 'roles', { value: signal(['ADMINISTRADOR']) });
    Object.defineProperty(authStateSpy, 'permissions', {
      value: signal(['DASHBOARD_VIEW', 'PRODUCT_VIEW']),
    });
    authStateSpy.hasPermission.and.returnValue(true);
    authStateSpy.hasAnyPermission.and.returnValue(true);

    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [AdminShellComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AuthState, useValue: authStateSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(AdminShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente con estados iniciales cerrados', () => {
    expect(component).toBeTruthy();
    expect(component.isMobileOpen()).toBeFalse();
    expect(component.isSidebarCollapsed()).toBeFalse();
  });

  it('debe alternar y cerrar el menú móvil con toggleMobileMenu() y closeMobileMenu()', () => {
    component.toggleMobileMenu();
    expect(component.isMobileOpen()).toBeTrue();

    component.closeMobileMenu();
    expect(component.isMobileOpen()).toBeFalse();
  });

  it('debe alternar el colapso del sidebar desktop con toggleSidebarCollapse()', () => {
    expect(component.isSidebarCollapsed()).toBeFalse();

    component.toggleSidebarCollapse();
    expect(component.isSidebarCollapsed()).toBeTrue();

    component.toggleSidebarCollapse();
    expect(component.isSidebarCollapsed()).toBeFalse();
  });

  it('debe ejecutar handleLogout(): llamar al servicio, limpiar sesión, notificar y redirigir a /login', () => {
    component.handleLogout();

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(authStateSpy.clearSession).toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Sesión finalizada correctamente.',
      'Cerrar',
      jasmine.any(Object)
    );
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
