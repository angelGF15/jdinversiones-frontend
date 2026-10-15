import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { AttributesListComponent } from './attributes-list.component';
import { AttributesService } from '../../../../../core/services/attributes.service';
import { AuthState } from '../../../../../core/auth/auth.state';
import {
  CatalogAttribute,
  AttributeListResponse,
} from '../../../../../core/models/attribute.models';
import { ConfirmDialogComponent } from '../../../../../shared/components';
import { AttributeFormDialogComponent } from '../dialogs';

describe('AttributesListComponent', () => {
  let component: AttributesListComponent;
  let fixture: ComponentFixture<AttributesListComponent>;
  let attributesServiceSpy: jasmine.SpyObj<AttributesService>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let routerSpy: jasmine.SpyObj<Router>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let queryParamsSubject: Subject<any>;

  const mockAttributes: CatalogAttribute[] = [
    {
      id: 'attr-1',
      name: 'Color',
      description: 'Color o tono del artículo',
      displayOrder: 1,
      isActive: true,
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-10T12:00:00.000Z',
    },
    {
      id: 'attr-2',
      name: 'Memoria RAM',
      description: 'Capacidad de memoria interna',
      displayOrder: 2,
      isActive: false,
      createdAt: '2026-10-10T13:00:00.000Z',
      updatedAt: '2026-10-10T13:00:00.000Z',
    },
    {
      id: 'attr-3',
      name: 'Talla',
      description: null,
      displayOrder: 3,
      isActive: true,
      createdAt: '2026-10-10T14:00:00.000Z',
      updatedAt: '2026-10-10T14:00:00.000Z',
    },
  ];

  const mockListResponse: AttributeListResponse = {
    items: mockAttributes,
    total: 3,
    page: 1,
    limit: 50,
    totalPages: 1,
  };

  beforeEach(() => {
    queryParamsSubject = new Subject<any>();
    attributesServiceSpy = jasmine.createSpyObj('AttributesService', [
      'list',
      'setStatus',
    ]);
    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission', 'hasAnyPermission']);
    (authStateSpy as any).profile = signal({
      userId: 'admin-1',
      permissions: ['ATTRIBUTE_VIEW', 'ATTRIBUTE_CREATE', 'ATTRIBUTE_EDIT', 'ATTRIBUTE_DELETE'],
    });

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    attributesServiceSpy.list.and.returnValue(of(mockListResponse));
    authStateSpy.hasPermission.and.returnValue(true);
    authStateSpy.hasAnyPermission.and.returnValue(true);

    const mockActivatedRoute = {
      snapshot: { queryParams: {} },
      queryParams: queryParamsSubject.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AttributesService, useValue: attributesServiceSpy },
        { provide: AuthState, useValue: authStateSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
      imports: [AttributesListComponent],
    });

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    routerSpy = router as any;

    fixture = TestBed.createComponent(AttributesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    queryParamsSubject.complete();
    component.queryState.destroy();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe cargar los atributos y actualizar las señales reactivas iniciales', () => {
    expect(attributesServiceSpy.list).toHaveBeenCalled();
    expect(component.items().length).toBe(3);
    expect(component.total()).toBe(3);
    expect(component.totalPages()).toBe(1);
    expect(component.isLoading()).toBeFalse();
    expect(component.errorMessage()).toBeNull();
  });

  describe('filtrado local reactivo (computed)', () => {
    it('debe retornar todos los elementos cuando searchQuery está vacío', () => {
      component.searchQuery.set('');
      expect(component.filteredItems().length).toBe(3);
      expect(component.filteredTotal()).toBe(3);
      expect(component.calculatedTotalPages()).toBe(1);
    });

    it('debe filtrar por coincidencia en el nombre (case-insensitive)', () => {
      component.searchQuery.set('ram');
      const filtered = component.filteredItems();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Memoria RAM');
      expect(component.filteredTotal()).toBe(1);
    });

    it('debe filtrar por coincidencia en la descripción', () => {
      component.searchQuery.set('tono');
      const filtered = component.filteredItems();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Color');
    });

    it('debe manejar atributos con descripción nula sin arrojar error', () => {
      component.searchQuery.set('talla');
      const filtered = component.filteredItems();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Talla');
    });

    it('debe retornar arreglo vacío cuando ningún elemento coincide', () => {
      component.searchQuery.set('inexistente_xyz');
      expect(component.filteredItems().length).toBe(0);
      expect(component.filteredTotal()).toBe(0);
      expect(component.calculatedTotalPages()).toBe(1);
    });
  });

  describe('filtros y paginación', () => {
    it('debe actualizar searchQuery y filtros en onFilterChange', () => {
      spyOn(component.queryState, 'updateFilters');

      component.onFilterChange({ search: 'color', isActive: true });

      expect(component.searchQuery()).toBe('color');
      expect(component.queryState.updateFilters).toHaveBeenCalledWith({
        search: 'color',
        isActive: true,
      });
    });

    it('debe delegar el cambio de página a queryState', () => {
      spyOn(component.queryState, 'setPage');
      component.onPageChange(2);
      expect(component.queryState.setPage).toHaveBeenCalledWith(2);
    });

    it('debe delegar el cambio de tamaño de página a queryState', () => {
      spyOn(component.queryState, 'setSize');
      component.onPageSizeChange(25);
      expect(component.queryState.setSize).toHaveBeenCalledWith(25);
    });

    it('debe solicitar reintento invocando applyToUrl', () => {
      spyOn(component.queryState, 'applyToUrl');
      component.retry();
      expect(component.queryState.applyToUrl).toHaveBeenCalled();
    });
  });

  describe('manejo de errores', () => {
    it('debe capturar error del servicio y asignar mensaje a errorMessage', () => {
      attributesServiceSpy.list.and.returnValue(
        throwError(() => ({
          error: { message: 'Error de conexión con el catálogo' },
        }))
      );

      component.onFilterChange({ isActive: false });
      fixture.detectChanges();

      expect(component.isLoading()).toBeFalse();
      expect(component.errorMessage()).toBe('Error de conexión con el catálogo');
    });
  });

  describe('onToggleStatus()', () => {
    it('debe abrir ConfirmDialogComponent y alternar el estado si el usuario confirma', () => {
      const dialogRefSpy = {
        afterClosed: () => of(true),
      } as MatDialogRef<ConfirmDialogComponent>;
      dialogSpy.open.and.returnValue(dialogRefSpy);

      const targetAttribute = mockAttributes[0]; // Color, isActive: true
      const updatedAttribute: CatalogAttribute = {
        ...targetAttribute,
        isActive: false,
      };
      attributesServiceSpy.setStatus.and.returnValue(of(updatedAttribute));

      component.onToggleStatus(targetAttribute);

      expect(dialogSpy.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        jasmine.objectContaining({
          width: '440px',
        })
      );
      expect(attributesServiceSpy.setStatus).toHaveBeenCalledWith('attr-1', false);

      const modified = component.items().find((a) => a.id === 'attr-1');
      expect(modified?.isActive).toBeFalse();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/desactivado exitosamente/),
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('no debe llamar al servicio si el usuario cancela en el diálogo de confirmación', () => {
      const dialogRefSpy = {
        afterClosed: () => of(false),
      } as MatDialogRef<ConfirmDialogComponent>;
      dialogSpy.open.and.returnValue(dialogRefSpy);

      component.onToggleStatus(mockAttributes[0]);

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(attributesServiceSpy.setStatus).not.toHaveBeenCalled();
    });

    it('debe desplegar modal de advertencia ante error 409 Conflict (atributo en uso)', () => {
      const confirmRefSpy = {
        afterClosed: () => of(true),
      } as MatDialogRef<ConfirmDialogComponent>;
      dialogSpy.open.and.returnValue(confirmRefSpy);

      const conflictResponse = new HttpErrorResponse({
        error: {
          message:
            'No se puede desactivar el atributo porque está en uso por uno o más productos',
        },
        status: 409,
        statusText: 'Conflict',
      });
      attributesServiceSpy.setStatus.and.returnValue(throwError(() => conflictResponse));

      component.onToggleStatus(mockAttributes[0]);

      // Primer llamado: confirmación; Segundo llamado: modal de advertencia 409
      expect(dialogSpy.open).toHaveBeenCalledTimes(2);
      expect(dialogSpy.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            title: 'No se puede desactivar el atributo',
            message:
              'No se puede desactivar el atributo porque está en uso por uno o más productos',
            icon: 'warning',
          }),
        })
      );
      // El atributo en la lista debe mantenerse intacto (activo)
      expect(component.items()[0].isActive).toBeTrue();
    });

    it('debe mostrar snackbar cuando ocurre un error genérico en setStatus', () => {
      const confirmRefSpy = {
        afterClosed: () => of(true),
      } as MatDialogRef<ConfirmDialogComponent>;
      dialogSpy.open.and.returnValue(confirmRefSpy);

      const errorResponse = new HttpErrorResponse({
        error: { message: 'Fallo interno al actualizar estado' },
        status: 500,
        statusText: 'Internal Server Error',
      });
      attributesServiceSpy.setStatus.and.returnValue(throwError(() => errorResponse));

      component.onToggleStatus(mockAttributes[0]);

      expect(dialogSpy.open).toHaveBeenCalledTimes(1);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Fallo interno al actualizar estado',
        'Cerrar',
        jasmine.any(Object)
      );
    });
  });

  describe('diálogos de creación y edición (onNewAttribute / onEditAttribute)', () => {
    it('debe abrir AttributeFormDialogComponent en modo creación e insertar el nuevo elemento', () => {
      const newAttr: CatalogAttribute = {
        id: 'new-attr-100',
        name: 'Garantía',
        description: 'Meses de garantía del fabricante',
        displayOrder: 10,
        isActive: true,
      };

      const dialogRefSpy = {
        afterClosed: () => of(newAttr),
      } as MatDialogRef<any>;
      dialogSpy.open.and.returnValue(dialogRefSpy);

      component.onNewAttribute();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        AttributeFormDialogComponent,
        jasmine.objectContaining({
          width: '520px',
          data: { mode: 'create' },
        })
      );
      expect(component.items().length).toBe(4);
      expect(component.items()[0]).toEqual(newAttr);
      expect(component.total()).toBe(4);
    });

    it('debe abrir AttributeFormDialogComponent en modo edición y actualizar el elemento en items', () => {
      const updatedAttr: CatalogAttribute = {
        ...mockAttributes[0],
        name: 'Color Metálico',
      };

      const dialogRefSpy = {
        afterClosed: () => of(updatedAttr),
      } as MatDialogRef<any>;
      dialogSpy.open.and.returnValue(dialogRefSpy);

      component.onEditAttribute(mockAttributes[0]);

      expect(dialogSpy.open).toHaveBeenCalledWith(
        AttributeFormDialogComponent,
        jasmine.objectContaining({
          width: '520px',
          data: { mode: 'edit', attribute: mockAttributes[0] },
        })
      );
      expect(component.items()[0].name).toBe('Color Metálico');
    });
  });
});
