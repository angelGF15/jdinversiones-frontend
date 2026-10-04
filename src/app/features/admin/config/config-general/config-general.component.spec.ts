import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { ConfigGeneralComponent } from './config-general.component';
import { ConfigService } from '../../../../core/services/config.service';
import { AuthState } from '../../../../core/auth/auth.state';
import { Setting } from '../../../../core/models/config.models';

describe('ConfigGeneralComponent', () => {
  let component: ConfigGeneralComponent;
  let fixture: ComponentFixture<ConfigGeneralComponent>;
  let configServiceSpy: jasmine.SpyObj<ConfigService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let authStateSpy: jasmine.SpyObj<AuthState>;

  const mockSettings: Setting[] = [
    {
      key: 'company_name',
      value: 'JD Inversiones S.A.',
      description: 'Nombre comercial',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'company_email',
      value: 'contacto@jdinversiones.com',
      description: 'Correo principal',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'currency',
      value: 'HNL',
      description: 'Código de moneda',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'default_theme',
      value: 'light',
      description: 'Tema predeterminado',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'no_movement_threshold_days',
      value: '30',
      description: 'Días sin ventas',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'unknown_custom_setting',
      value: 'custom_value',
      description: 'Configuración personalizada externa',
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    configServiceSpy = jasmine.createSpyObj('ConfigService', ['getSettings', 'updateSettings']);
    configServiceSpy.getSettings.and.returnValue(of({ settings: mockSettings }));
    configServiceSpy.updateSettings.and.returnValue(
      of({
        settings: [{ key: 'company_name', value: 'Nueva Empresa', description: '', updatedAt: '' }],
      })
    );

    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission']);
    authStateSpy.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ConfigGeneralComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ConfigService, useValue: configServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: AuthState, useValue: authStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigGeneralComponent);
    component = fixture.componentInstance;
    component.canEdit = true;
    fixture.detectChanges();
  });

  it('debe inicializarse y cargar settings en ngOnInit', () => {
    expect(component).toBeTruthy();
    expect(configServiceSpy.getSettings).toHaveBeenCalled();
    expect(component.settings().length).toBe(6);
  });

  it('debe renderizar filas y clasificar keys desconocidas en unknownRows', () => {
    expect(component.rows().length).toBe(6);
    expect(component.unknownRows().length).toBe(1);
    expect(component.unknownRows()[0].setting.key).toBe('unknown_custom_setting');
  });

  it('no debe llamar al servicio save() si no hay cambios (formulario pristine)', () => {
    component.save();
    expect(configServiceSpy.updateSettings).not.toHaveBeenCalled();
  });

  it('no debe llamar al servicio save() si algún campo dirty es inválido', () => {
    const ctrl = component.form.get('company_name');
    ctrl?.setValue('');
    ctrl?.markAsDirty();

    component.save();
    expect(configServiceSpy.updateSettings).not.toHaveBeenCalled();
    expect(component.isInvalid('company_name')).toBeTrue();
  });

  it('debe enviar un solo PATCH con todas las keys sucias en save() y hacer merge', () => {
    const nameCtrl = component.form.get('company_name');
    nameCtrl?.setValue('Nueva Empresa');
    nameCtrl?.markAsDirty();

    expect(component.isDirty()).toBeTrue();
    expect(component.dirtyItems()).toEqual([{ key: 'company_name', value: 'Nueva Empresa' }]);

    component.save();

    expect(configServiceSpy.updateSettings).toHaveBeenCalledWith([
      { key: 'company_name', value: 'Nueva Empresa' },
    ]);

    // Merge verification
    const current = component.settings();
    const updated = current.find((s) => s.key === 'company_name');
    expect(updated?.value).toBe('Nueva Empresa');
    const emailSetting = current.find((s) => s.key === 'company_email');
    expect(emailSetting?.value).toBe('contacto@jdinversiones.com');
  });

  it('debe manejar error 409 o fallo del backend mostrando banner y snackbar', () => {
    const errorResponse = new HttpErrorResponse({
      status: 409,
      error: { message: 'Conflicto de configuración en base de datos' },
    });
    configServiceSpy.updateSettings.and.returnValue(throwError(() => errorResponse));

    const nameCtrl = component.form.get('company_name');
    nameCtrl?.setValue('Conflicto');
    nameCtrl?.markAsDirty();

    component.save();

    expect(component.isSaving()).toBeFalse();
    expect(component.errorMessage()).toBe('Conflicto de configuración en base de datos');
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('debe normalizar valores: vacío como null y trim adecuado', () => {
    expect(component.normalizeValue('')).toBeNull();
    expect(component.normalizeValue('   ')).toBeNull();
    expect(component.normalizeValue(null)).toBeNull();
    expect(component.normalizeValue('  valor  ')).toBe('valor');
    expect(component.normalizeValue(100)).toBe('100');
  });

  it('debe restaurar valores originales al invocar discard()', () => {
    const nameCtrl = component.form.get('company_name');
    nameCtrl?.setValue('Cambio Temporal');
    nameCtrl?.markAsDirty();

    expect(component.isDirty()).toBeTrue();

    component.discard();

    expect(component.isDirty()).toBeFalse();
    expect(nameCtrl?.value).toBe('JD Inversiones S.A.');
  });
});
