import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { ConfigGeneralComponent } from './config-general.component';
import { ConfigService } from '../../../../core/services/config.service';
import { BrandService } from '../../../../core/services/brand.service';
import { AuthState } from '../../../../core/auth/auth.state';
import { ConfigGroup, Setting } from '../../../../core/models/config.models';

describe('ConfigGeneralComponent', () => {
  let component: ConfigGeneralComponent;
  let fixture: ComponentFixture<ConfigGeneralComponent>;
  let configServiceSpy: jasmine.SpyObj<ConfigService>;
  let brandServiceSpy: jasmine.SpyObj<BrandService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let authStateSpy: jasmine.SpyObj<AuthState>;

  const mockGroups: ConfigGroup[] = [
    { code: 'empresa', label: 'Empresa', description: 'Datos institucionales', icon: 'storefront' },
    { code: 'sistema', label: 'Sistema', description: 'Parámetros del sistema', icon: 'tune' },
  ];

  const mockSettings: Setting[] = [
    {
      key: 'company_name',
      value: 'JD Inversiones S.A.',
      description: 'Nombre comercial',
      groupCode: 'empresa',
      sortOrder: 1,
      isRequired: true,
      isPublic: true,
      type: { code: 'text', name: 'Texto', maxLength: 100 },
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'company_email',
      value: 'contacto@jdinversiones.com',
      description: 'Correo principal',
      groupCode: 'empresa',
      sortOrder: 2,
      isRequired: false,
      isPublic: true,
      type: { code: 'email', name: 'Correo Electrónico', maxLength: 150 },
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'primary_color',
      value: '#032EDD',
      description: 'Color primario de la marca',
      groupCode: 'empresa',
      sortOrder: 3,
      isRequired: false,
      isPublic: true,
      type: { code: 'color', name: 'Color Hexadecimal' },
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'currency',
      value: 'HNL',
      description: 'Código de moneda',
      groupCode: 'sistema',
      sortOrder: 1,
      isRequired: true,
      isPublic: false,
      type: { code: 'currency', name: 'Moneda' },
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'default_theme',
      value: 'light',
      description: 'Tema predeterminado',
      groupCode: 'sistema',
      sortOrder: 2,
      isRequired: false,
      isPublic: false,
      type: { code: 'theme', name: 'Tema visual' },
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      key: 'no_movement_threshold_days',
      value: '30',
      description: 'Días sin ventas',
      groupCode: 'sistema',
      sortOrder: 3,
      isRequired: false,
      isPublic: false,
      type: { code: 'number', name: 'Número Entero' },
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    configServiceSpy = jasmine.createSpyObj('ConfigService', [
      'getSettings',
      'updateSettings',
      'deleteLogo',
    ]);
    configServiceSpy.getSettings.and.returnValue(
      of({ settings: mockSettings, groups: mockGroups })
    );
    configServiceSpy.updateSettings.and.returnValue(
      of({
        settings: [
          {
            key: 'company_name',
            value: 'Nueva Empresa',
            description: '',
            groupCode: 'empresa',
            sortOrder: 1,
            isRequired: true,
            isPublic: true,
            type: { code: 'text', name: 'Texto' },
            updatedAt: '',
          },
        ],
      })
    );

    brandServiceSpy = jasmine.createSpyObj('BrandService', [
      'applyPrimaryColor',
      'refresh',
      'patchBrandLocally',
    ]);
    brandServiceSpy.refresh.and.returnValue(of(null));

    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission']);
    authStateSpy.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ConfigGeneralComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ConfigService, useValue: configServiceSpy },
        { provide: BrandService, useValue: brandServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: AuthState, useValue: authStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigGeneralComponent);
    component = fixture.componentInstance;
    component.canEdit = true;
    spyOn((component as any).dialog, 'open').and.returnValue({ afterClosed: () => of(null) } as any);
    fixture.detectChanges();
  });

  it('debe inicializarse y cargar settings en ngOnInit', () => {
    expect(component).toBeTruthy();
    expect(configServiceSpy.getSettings).toHaveBeenCalled();
    expect(component.settings().length).toBe(6);
    expect(component.groups().length).toBe(2);
  });

  it('debe renderizar filas y agruparlas correctamente en groupedRows', () => {
    expect(component.rows().length).toBe(6);
    const grouped = component.groupedRows();
    expect(grouped.length).toBe(2);
    expect(grouped[0].code).toBe('empresa');
    expect(grouped[0].rows.length).toBe(3);
    expect(grouped[1].code).toBe('sistema');
    expect(grouped[1].rows.length).toBe(3);
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
    expect(brandServiceSpy.patchBrandLocally).toHaveBeenCalledWith(
      jasmine.objectContaining({ name: 'Nueva Empresa' })
    );

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

  it('debe abrir el diálogo para subir logotipo', () => {
    component.openLogoDialog('https://example.com/logo.png');
    expect((component as any).dialog.open).toHaveBeenCalled();
  });
});
