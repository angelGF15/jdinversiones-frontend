import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { CategoriesListComponent } from './categories-list.component';
import { CategoriesService } from '../../../../../core/services/categories.service';
import { AuthState } from '../../../../../core/auth/auth.state';
import {
  CategoryChild,
  CategoryListResponse,
} from '../../../../../core/models/category.models';
import { ConfirmDialogComponent } from '../../../../../shared/components';

describe('CategoriesListComponent', () => {
  let component: CategoriesListComponent;
  let fixture: ComponentFixture<CategoriesListComponent>;
  let categoriesServiceSpy: jasmine.SpyObj<CategoriesService>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let queryParamsSubject: Subject<any>;

  const mockCategories: CategoryChild[] = [
    {
      id: 'cat-1',
      name: 'Electrónica',
      slug: 'electronica',
      description: 'Dispositivos electrónicos y tecnología',
      parentId: null,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/electronics.jpg',
      displayOrder: 1,
      isActive: true,
      productCount: 25,
      childrenCount: 3,
      createdAt: '2026-08-15T10:00:00.000Z',
      updatedAt: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'cat-2',
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Teléfonos móviles',
      parentId: 'cat-1',
      imageUrl: null,
      displayOrder: 1,
      isActive: true,
      productCount: 10,
      childrenCount: 0,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
    },
  ];

  const mockListResponse: CategoryListResponse = {
    items: mockCategories,
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockParentCategories: CategoryChild[] = [mockCategories[0]];

  beforeEach(() => {
    queryParamsSubject = new Subject<any>();
    categoriesServiceSpy = jasmine.createSpyObj('CategoriesService', [
      'list',
      'listParents',
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
      permissions: ['CATEGORY_VIEW', 'CATEGORY_CREATE', 'CATEGORY_EDIT'],
    });

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    categoriesServiceSpy.list.and.returnValue(of(mockListResponse));
    categoriesServiceSpy.listParents.and.returnValue(of(mockParentCategories));
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
        { provide: CategoriesService, useValue: categoriesServiceSpy },
        { provide: AuthState, useValue: authStateSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
      imports: [CategoriesListComponent],
    });

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(CategoriesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    queryParamsSubject.complete();
    component.queryState.destroy();
  });

  it('debe crearse y cargar el listado y el catálogo de categorías padre', () => {
    expect(component).toBeTruthy();
    expect(categoriesServiceSpy.listParents).toHaveBeenCalled();
    expect(categoriesServiceSpy.list).toHaveBeenCalled();
    expect(component.items().length).toBe(2);
    expect(component.parents().length).toBe(1);
    expect(component.parentFilters()[0].options.length).toBe(1);
  });

  it('debe resolver correctamente el nombre del padre jerárquico', () => {
    expect(component.getParentName(null)).toBe('Principal (Raíz)');
    expect(component.getParentName('cat-1')).toBe('Electrónica');
    expect(component.getParentName('cat-desconocido')).toBe('Subcategoría');
  });

  it('debe registrar error de imagen en brokenImageIds', () => {
    expect(component.isImageBroken('cat-1')).toBeFalse();
    component.onImageError('cat-1');
    expect(component.isImageBroken('cat-1')).toBeTrue();
  });

  it('debe manejar error al consultar listado y reflejarlo en errorMessage', () => {
    categoriesServiceSpy.list.and.returnValue(
      throwError(() => new HttpErrorResponse({ error: { message: 'Error de servidor' }, status: 500 }))
    );

    component.retry();
    fixture.detectChanges();
    expect(component.errorMessage()).toBe('Error de servidor');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe actualizar filtros cuando se dispara onFilterChange()', () => {
    spyOn(component.queryState, 'updateFilters');
    component.onFilterChange({ search: 'smart' });
    expect(component.queryState.updateFilters).toHaveBeenCalledWith({ search: 'smart' });
  });

  it('debe actualizar página y límite con onPageChange() y onPageSizeChange()', () => {
    spyOn(component.queryState, 'setPage');
    spyOn(component.queryState, 'setSize');

    component.onPageChange(2);
    expect(component.queryState.setPage).toHaveBeenCalledWith(2);

    component.onPageSizeChange(50);
    expect(component.queryState.setSize).toHaveBeenCalledWith(50);
  });

  it('debe abrir ConfirmDialogComponent en onToggleStatus() y desactivar si se confirma', () => {
    const dialogRefSpy = {
      afterClosed: () => of(true),
    } as MatDialogRef<ConfirmDialogComponent>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    const updatedCategory = { ...mockCategories[0], isActive: false };
    categoriesServiceSpy.setStatus.and.returnValue(of(updatedCategory));

    component.onToggleStatus(mockCategories[0]);

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(categoriesServiceSpy.setStatus).toHaveBeenCalledWith('cat-1', false);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('desactivada exitosamente'),
      'Cerrar',
      jasmine.any(Object)
    );
  });

  it('debe mostrar mensaje de error en snackbar si la desactivación falla con 409', () => {
    const dialogRefSpy = {
      afterClosed: () => of(true),
    } as MatDialogRef<ConfirmDialogComponent>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    categoriesServiceSpy.setStatus.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              message: 'No se puede desactivar la categoría porque tiene productos asociados activos',
            },
          })
      )
    );

    component.onToggleStatus(mockCategories[0]);

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'No se puede desactivar la categoría porque tiene productos asociados activos',
      'Cerrar',
      jasmine.any(Object)
    );
  });
});
