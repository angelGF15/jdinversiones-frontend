import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DashboardComponent } from './dashboard.component';
import { AuthState } from '../../../core/auth/auth.state';
import { LoadingService } from '../../../core/services/loading.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let loadingServiceSpy: jasmine.SpyObj<LoadingService>;

  beforeEach(async () => {
    authStateSpy = jasmine.createSpyObj('AuthState', [
      'hasPermission',
      'hasAnyPermission',
    ]);
    Object.defineProperty(authStateSpy, 'fullName', { value: signal('Angel Flores') });
    Object.defineProperty(authStateSpy, 'userEmail', { value: signal('angel@jdinversiones.hn') });
    Object.defineProperty(authStateSpy, 'roles', { value: signal(['ADMINISTRADOR']) });
    Object.defineProperty(authStateSpy, 'permissions', {
      value: signal(['DASHBOARD_VIEW', 'PRODUCT_VIEW', 'SALES_CREATE']),
    });
    authStateSpy.hasPermission.and.returnValue(true);
    authStateSpy.hasAnyPermission.and.returnValue(true);

    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    loadingServiceSpy = jasmine.createSpyObj('LoadingService', ['show', 'hide', 'withLoading']);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: AuthState, useValue: authStateSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: LoadingService, useValue: loadingServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente y mostrar el nombre del usuario autenticado', () => {
    expect(component).toBeTruthy();
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Angel Flores');
  });

  it('debe contener los 4 KPIs principales de resumen comercial e inventario', () => {
    expect(component.kpis.length).toBe(4);
    expect(component.kpis[0].title).toBe('Productos Activos');
    expect(component.kpis[1].title).toBe('Inventario Disponible');
    expect(component.kpis[2].title).toBe('Ventas del Mes (HNL)');
    expect(component.kpis[3].title).toBe('Alertas de Stock');
  });

  it('debe activar y desactivar isRefreshing al llamar a refreshMetrics()', () => {
    jasmine.clock().install();
    try {
      expect(component.isRefreshing()).toBeFalse();
      component.refreshMetrics();
      expect(component.isRefreshing()).toBeTrue();

      jasmine.clock().tick(650);

      expect(component.isRefreshing()).toBeFalse();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Métricas sincronizadas en tiempo real.',
        'Cerrar',
        jasmine.any(Object)
      );
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
