import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';

import { ProductsListComponent } from './products-list.component';
import { ProductsService } from '../../../../../core/services/products/products.service';
import { CategoriesService } from '../../../../../core/services/categories/categories.service';
import { BrandsService } from '../../../../../core/services/brands/brands.service';
import { AuthState } from '../../../../../core/auth/auth.state';
import {
  ProductDetail,
  ProductListItem,
  ProductListResponse,
  ProductStatus,
} from '../../../../../core/models/product.models';
import { CategoryChild } from '../../../../../core/models/category.models';
import { CatalogBrand } from '../../../../../core/models/brand.models';
import { ConfirmDialogComponent } from '../../../../../shared/components';

describe('ProductsListComponent', () => {
  let component: ProductsListComponent;
  let fixture: ComponentFixture<ProductsListComponent>;
  let productsServiceSpy: jasmine.SpyObj<ProductsService>;
  let categoriesServiceSpy: jasmine.SpyObj<CategoriesService>;
  let brandsServiceSpy: jasmine.SpyObj<BrandsService>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let routerSpy: jasmine.SpyObj<Router>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let queryParamsSubject: Subject<any>;

  const mockProducts: ProductListItem[] = [
    {
      id: 'prod-1',
      sku: 'LAP-MBP16',
      name: 'MacBook Pro 16 M3 Max',
      slug: 'macbook-pro-16-m3-max',
      price: 68500,
      costPrice: 52000,
      isFeatured: true,
      statusId: 'st-1',
      statusCode: 'active',
      categoryId: 'cat-1',
      categoryName: 'Laptops',
      brandId: 'brand-1',
      brandName: 'Apple',
      primaryImageUrl: 'https://res.cloudinary.com/demo/image/upload/mbp16.jpg',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
    },
    {
      id: 'prod-2',
      sku: 'MON-LG27',
      name: 'Monitor LG UltraGear 27"',
      slug: 'monitor-lg-ultragear-27',
      price: 9800,
      costPrice: null,
      isFeatured: false,
      statusId: 'st-2',
      statusCode: 'draft',
      categoryId: 'cat-2',
      categoryName: 'Monitores',
      brandId: 'brand-2',
      brandName: 'LG',
      primaryImageUrl: null,
      createdAt: '2026-10-03T10:00:00.000Z',
      updatedAt: '2026-10-03T10:00:00.000Z',
    },
  ];

  const mockListResponse: ProductListResponse = {
    items: mockProducts,
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockCategories: CategoryChild[] = [
    {
      id: 'cat-1',
      name: 'Laptops',
      slug: 'laptops',
      description: null,
      parentId: null,
      imageUrl: null,
      displayOrder: 1,
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  const mockBrands: CatalogBrand[] = [
    {
      id: 'brand-1',
      name: 'Apple',
      slug: 'apple',
      logoUrl: null,
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  const mockStatuses: ProductStatus[] = [
    { id: 'st-1', code: 'active', name: 'Activo' },
    { id: 'st-2', code: 'draft', name: 'Borrador' },
    { id: 'st-3', code: 'inactive', name: 'Inactivo' },
  ];

  beforeEach(() => {
    queryParamsSubject = new Subject<any>();

    productsServiceSpy = jasmine.createSpyObj('ProductsService', [
      'list',
      'listStatuses',
      'setStatus',
      'export',
    ]);
    categoriesServiceSpy = jasmine.createSpyObj('CategoriesService', ['listParents']);
    brandsServiceSpy = jasmine.createSpyObj('BrandsService', ['listActive']);
    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission', 'hasAnyPermission']);
    (authStateSpy as any).profile = signal({
      userId: 'admin-1',
      permissions: ['PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_EDIT', 'PRODUCT_EXPORT'],
    });

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    productsServiceSpy.list.and.returnValue(of(mockListResponse));
    productsServiceSpy.listStatuses.and.returnValue(of(mockStatuses));
    categoriesServiceSpy.listParents.and.returnValue(of(mockCategories));
    brandsServiceSpy.listActive.and.returnValue(of(mockBrands));
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
        { provide: ProductsService, useValue: productsServiceSpy },
        { provide: CategoriesService, useValue: categoriesServiceSpy },
        { provide: BrandsService, useValue: brandsServiceSpy },
        { provide: AuthState, useValue: authStateSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
      imports: [ProductsListComponent],
    });

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    routerSpy = router as any;

    fixture = TestBed.createComponent(ProductsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    queryParamsSubject.complete();
    component.queryState.destroy();
  });

  it('debe crearse y cargar los catálogos de categorías, marcas y estados para filtros', () => {
    expect(component).toBeTruthy();
    expect(categoriesServiceSpy.listParents).toHaveBeenCalled();
    expect(brandsServiceSpy.listActive).toHaveBeenCalled();
    expect(productsServiceSpy.listStatuses).toHaveBeenCalled();

    const selects = component.selectFilters();
    expect(selects.length).toBe(3);
    expect(selects[0].key).toBe('categoryId');
    expect(selects[1].key).toBe('brandId');
    expect(selects[2].key).toBe('statusCode');
  });

  it('debe listar los productos y actualizar las señales reactivas', () => {
    expect(productsServiceSpy.list).toHaveBeenCalled();
    expect(component.items().length).toBe(2);
    expect(component.total()).toBe(2);
    expect(component.totalPages()).toBe(1);
    expect(component.isLoading()).toBeFalse();
    expect(component.errorMessage()).toBeNull();
  });

  it('debe navegar hacia la pantalla de edición al invocar onEditProduct', () => {
    component.onEditProduct(mockProducts[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/admin/inventory/products',
      'prod-1',
      'edit',
    ]);
  });

  it('debe calcular correctamente el margen bruto porcentual cuando existe costPrice', () => {
    const margin = component.getGrossMarginPercent(mockProducts[0]);
    expect(margin).not.toBeNull();
    expect(margin!).toBeCloseTo(((68500 - 52000) / 68500) * 100, 2);
    expect(component.getGrossMarginPercent(mockProducts[1])).toBeNull();
  });

  it('debe manejar errores de la API asignando errorMessage y deteniendo isLoading', () => {
    productsServiceSpy.list.and.returnValue(
      throwError(() => ({
        error: { message: 'Error al consultar productos en el servidor' },
      }))
    );

    component.onFilterChange({ search: 'fallo' });
    fixture.detectChanges();

    expect(component.isLoading()).toBeFalse();
    expect(component.errorMessage()).toBe('Error al consultar productos en el servidor');
  });

  describe('Cambio de Estado (onToggleStatus)', () => {
    it('no debe llamar a setStatus si el usuario cancela el diálogo de confirmación', () => {
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(false),
      } as MatDialogRef<any>);

      component.onToggleStatus(mockProducts[0]);

      expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmDialogComponent, jasmine.any(Object));
      expect(productsServiceSpy.setStatus).not.toHaveBeenCalled();
    });

    it('debe desactivar un producto activo y actualizar reactivamente el signal items', () => {
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<any>);

      const updatedDetail: ProductDetail = {
        ...mockProducts[0],
        statusCode: 'inactive',
        statusId: 'st-3',
        shortDescription: null,
        description: null,
        metaTitle: null,
        metaDescription: null,
        images: [],
        attributes: [],
      };
      productsServiceSpy.setStatus.and.returnValue(of(updatedDetail));

      component.onToggleStatus(mockProducts[0]);

      expect(productsServiceSpy.setStatus).toHaveBeenCalledWith('prod-1', 'inactive');
      const updatedItem = component.items().find((p) => p.id === 'prod-1');
      expect(updatedItem?.statusCode).toBe('inactive');
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/actualizado a inactivo exitosamente/),
        'Cerrar',
        jasmine.any(Object)
      );
    });
  });

  describe('Exportación a Excel y CSV (onExport)', () => {
    it('debe exportar a Excel (.xlsx), disparar la descarga y mostrar snackbar de éxito', () => {
      const mockBlob = new Blob(['test'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      productsServiceSpy.export.and.returnValue(
        of({ blob: mockBlob, filename: 'productos-2026-10-15.xlsx' })
      );
      spyOn(component, 'triggerFileDownload');

      component.onExport('xlsx');

      expect(productsServiceSpy.export).toHaveBeenCalledWith(
        component.queryState.state(),
        'xlsx'
      );
      expect(component.isExporting()).toBeFalse();
      expect(component.triggerFileDownload).toHaveBeenCalledWith(
        mockBlob,
        'productos-2026-10-15.xlsx'
      );
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Listado de productos exportado exitosamente',
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('debe manejar errores durante la exportación y restaurar isExporting a false', () => {
      productsServiceSpy.export.and.returnValue(
        throwError(() => ({
          error: { message: 'Error al generar el archivo de exportación' },
        }))
      );

      component.onExport('csv');

      expect(component.isExporting()).toBeFalse();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Error al generar el archivo de exportación',
        'Cerrar',
        jasmine.any(Object)
      );
    });
  });
});
