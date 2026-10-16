import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { BrandsListComponent } from './brands-list.component';
import { BrandsService } from '../../../../../core/services/brands/brands.service';
import { AuthState } from '../../../../../core/auth/auth.state';
import {
  CatalogBrand,
  BrandListResponse,
} from '../../../../../core/models/brand.models';
import { ConfirmDialogComponent } from '../../../../../shared/components';

describe('BrandsListComponent', () => {
  let component: BrandsListComponent;
  let fixture: ComponentFixture<BrandsListComponent>;
  let brandsServiceSpy: jasmine.SpyObj<BrandsService>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let queryParamsSubject: Subject<any>;

  const mockBrands: CatalogBrand[] = [
    {
      id: 'brand-1',
      name: 'Sony Corporation',
      slug: 'sony-corporation',
      logoUrl: 'https://res.cloudinary.com/demo/image/upload/sony.png',
      isActive: true,
      productCount: 15,
      createdAt: '2026-08-15T10:00:00.000Z',
      updatedAt: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'brand-2',
      name: 'Apple',
      slug: 'apple',
      logoUrl: null,
      isActive: true,
      productCount: 8,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
    },
  ];

  const mockListResponse: BrandListResponse = {
    items: mockBrands,
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(() => {
    queryParamsSubject = new Subject<any>();
    brandsServiceSpy = jasmine.createSpyObj('BrandsService', [
      'list',
      'setStatus',
    ]);
    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission', 'hasAnyPermission']);
    (authStateSpy as any).profile = signal({
      userId: 'admin-1',
      entityId: 'entity-1',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@jdinversiones.com',
      roles: ['Administrador'],
      permissions: ['BRAND_VIEW', 'BRAND_CREATE', 'BRAND_EDIT'],
    });

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    brandsServiceSpy.list.and.returnValue(of(mockListResponse));
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
        { provide: BrandsService, useValue: brandsServiceSpy },
        { provide: AuthState, useValue: authStateSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
      imports: [BrandsListComponent],
    });

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(BrandsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    queryParamsSubject.complete();
    component.queryState.destroy();
  });

  it('debe crearse y cargar el listado de marcas inicial', () => {
    expect(component).toBeTruthy();
    expect(brandsServiceSpy.list).toHaveBeenCalled();
    expect(component.items().length).toBe(2);
    expect(component.total()).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe generar iniciales tipográficas de respaldo con getInitials()', () => {
    expect(component.getInitials('Sony')).toBe('SO');
    expect(component.getInitials('Apple Inc')).toBe('AI');
    expect(component.getInitials('Hewlett Packard Enterprise')).toBe('HP');
    expect(component.getInitials('X')).toBe('X');
    expect(component.getInitials('')).toBe('??');
  });

  it('debe registrar error de imagen en brokenImageIds', () => {
    expect(component.isImageBroken('brand-1')).toBeFalse();
    component.onImageError('brand-1');
    expect(component.isImageBroken('brand-1')).toBeTrue();
  });

  it('debe manejar error al consultar listado y reflejarlo en errorMessage', () => {
    brandsServiceSpy.list.and.returnValue(
      throwError(() => new HttpErrorResponse({ error: { message: 'Error de servidor' }, status: 500 }))
    );

    component.retry();
    fixture.detectChanges();
    expect(component.errorMessage()).toBe('Error de servidor');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe actualizar filtros cuando se dispara onFilterChange()', () => {
    spyOn(component.queryState, 'updateFilters');
    component.onFilterChange({ search: 'apple' });
    expect(component.queryState.updateFilters).toHaveBeenCalledWith({ search: 'apple' });
  });

  it('debe actualizar página y límite con onPageChange() y onPageSizeChange()', () => {
    spyOn(component.queryState, 'setPage');
    spyOn(component.queryState, 'setSize');

    component.onPageChange(2);
    expect(component.queryState.setPage).toHaveBeenCalledWith(2);

    component.onPageSizeChange(50);
    expect(component.queryState.setSize).toHaveBeenCalledWith(50);
  });

  it('debe abrir ConfirmDialogComponent en onToggleStatus() y cambiar estado si se confirma', () => {
    const dialogRefSpy = {
      afterClosed: () => of(true),
    } as MatDialogRef<ConfirmDialogComponent>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    const updatedBrand = { ...mockBrands[0], isActive: false };
    brandsServiceSpy.setStatus.and.returnValue(of(updatedBrand));

    component.onToggleStatus(mockBrands[0]);

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(brandsServiceSpy.setStatus).toHaveBeenCalledWith('brand-1', false);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('desactivada exitosamente'),
      'Cerrar',
      jasmine.any(Object)
    );
  });

  it('debe abrir modal informativo de conflicto si la desactivación falla con 409 y navegar a productos si confirma', () => {
    const router = TestBed.inject(Router);
    const dialogRefSpy = {
      afterClosed: () => of(true),
    } as MatDialogRef<ConfirmDialogComponent>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    brandsServiceSpy.setStatus.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              message: 'No se puede desactivar la marca porque tiene productos asociados activos',
            },
          })
      )
    );

    component.onToggleStatus(mockBrands[0]);

    expect(dialogSpy.open).toHaveBeenCalledTimes(2);
    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          title: 'No se puede desactivar la marca',
          message: jasmine.stringContaining('No se puede desactivar la marca'),
          confirmText: 'Ver Productos',
        }),
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/admin/inventory/products'], {
      queryParams: { brandId: 'brand-1' },
    });
  });

  it('debe abrir BrandFormDialogComponent en onNewBrand() y anteponer la marca creada', () => {
    const newBrand: CatalogBrand = {
      id: 'brand-new',
      name: 'Nintendo',
      slug: 'nintendo',
      logoUrl: null,
      isActive: true,
      productCount: 0,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    };

    const dialogRefSpy = {
      afterClosed: () => of(newBrand),
    } as MatDialogRef<any>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    const initialTotal = component.total();
    component.onNewBrand();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(component.items()[0].id).toBe('brand-new');
    expect(component.total()).toBe(initialTotal + 1);
  });

  it('debe abrir BrandFormDialogComponent en onEditBrand() y actualizar la marca en items', () => {
    const editedBrand: CatalogBrand = {
      ...mockBrands[0],
      name: 'Sony Corporation Renamed',
    };

    const dialogRefSpy = {
      afterClosed: () => of(editedBrand),
    } as MatDialogRef<any>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.onEditBrand(mockBrands[0]);

    expect(dialogSpy.open).toHaveBeenCalled();
    const updated = component.items().find((i) => i.id === 'brand-1');
    expect(updated?.name).toBe('Sony Corporation Renamed');
  });

  it('debe abrir BrandLogoDialogComponent en onUpdateLogo() y actualizar logoUrl en items', () => {
    component.brokenImageIds.set(new Set(['brand-1']));
    const updatedLogoBrand: CatalogBrand = {
      ...mockBrands[0],
      logoUrl: 'https://res.cloudinary.com/demo/image/upload/sony-new.png',
    };

    const dialogRefSpy = {
      afterClosed: () => of(updatedLogoBrand),
    } as MatDialogRef<any>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.onUpdateLogo(mockBrands[0]);

    expect(dialogSpy.open).toHaveBeenCalled();
    const updated = component.items().find((i) => i.id === 'brand-1');
    expect(updated?.logoUrl).toBe('https://res.cloudinary.com/demo/image/upload/sony-new.png');
    expect(component.brokenImageIds().has('brand-1')).toBeFalse();
  });
});
