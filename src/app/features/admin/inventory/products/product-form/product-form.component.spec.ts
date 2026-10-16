import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ProductFormComponent } from './product-form.component';
import { ProductsService } from '../../../../../core/services/products/products.service';
import { CategoriesService } from '../../../../../core/services/categories/categories.service';
import { BrandsService } from '../../../../../core/services/brands/brands.service';
import { AttributesService } from '../../../../../core/services/attributes/attributes.service';
import {
  ProductDetail,
  ProductStatus,
} from '../../../../../core/models/product.models';
import { CategoryChild } from '../../../../../core/models/category.models';
import { CatalogBrand } from '../../../../../core/models/brand.models';

describe('ProductFormComponent', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;
  let productsServiceSpy: jasmine.SpyObj<ProductsService>;
  let categoriesServiceSpy: jasmine.SpyObj<CategoriesService>;
  let brandsServiceSpy: jasmine.SpyObj<BrandsService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let routerSpy: jasmine.SpyObj<Router>;

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

  const mockProductDetail: ProductDetail = {
    id: 'prod-1',
    sku: 'LAP-MBP16',
    name: 'MacBook Pro 16 M3 Max',
    slug: 'macbook-pro-16-m3-max',
    shortDescription: 'Portátil profesional con chip M3 Max',
    description: 'Descripción completa de la laptop MacBook Pro 16.',
    price: 68500,
    costPrice: 51375,
    isFeatured: true,
    statusId: 'st-1',
    statusCode: 'active',
    categoryId: 'cat-1',
    categoryName: 'Laptops',
    brandId: 'brand-1',
    brandName: 'Apple',
    primaryImageUrl: 'https://res.cloudinary.com/demo/image/upload/mbp16.jpg',
    metaTitle: 'Comprar MacBook Pro 16 M3 Max | JD Inversiones',
    metaDescription: 'Encuentra la MacBook Pro 16 M3 Max al mejor precio en Honduras.',
    images: [],
    attributes: [],
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  };

  const createTestBed = (routeParams: Record<string, any> = {}) => {
    productsServiceSpy = jasmine.createSpyObj('ProductsService', [
      'listStatuses',
      'getById',
      'create',
      'update',
      'setStatus',
    ]);
    categoriesServiceSpy = jasmine.createSpyObj('CategoriesService', ['listParents']);
    brandsServiceSpy = jasmine.createSpyObj('BrandsService', ['listActive']);
    const attributesServiceSpy = jasmine.createSpyObj('AttributesService', ['listActive']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    productsServiceSpy.listStatuses.and.returnValue(of(mockStatuses));
    productsServiceSpy.getById.and.returnValue(of(mockProductDetail));
    categoriesServiceSpy.listParents.and.returnValue(of(mockCategories));
    brandsServiceSpy.listActive.and.returnValue(of(mockBrands));
    attributesServiceSpy.listActive.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ProductsService, useValue: productsServiceSpy },
        { provide: CategoriesService, useValue: categoriesServiceSpy },
        { provide: BrandsService, useValue: brandsServiceSpy },
        { provide: AttributesService, useValue: attributesServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: routeParams } },
        },
      ],
      imports: [ProductFormComponent],
    });

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    routerSpy = router as any;

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('Modo Creación (/admin/inventory/products/new)', () => {
    beforeEach(() => {
      createTestBed({});
    });

    it('debe inicializarse en modo creación con formulario inválido por defecto', () => {
      expect(component.isEditMode()).toBeFalse();
      expect(component.form.invalid).toBeTrue();
    });

    it('debe autogenerar el slug en tiempo real al escribir el nombre del producto', () => {
      component.form.controls.name.setValue('iPhone 16 Pro Max 256GB!');
      expect(component.form.controls.slug.value).toBe('iphone-16-pro-max-256gb');
    });

    it('debe calcular reactivamente el margen bruto y utilidad unitaria', () => {
      component.form.patchValue({
        price: 1000,
        costPrice: 750,
      });

      expect(component.unitProfit).toBe(250);
      expect(component.grossMarginPercent).toBe(25);
      expect(component.marginHealth).toBe('medium');
    });

    it('debe enviar POST /products al crear exitosamente y redirigir al listado', () => {
      productsServiceSpy.create.and.returnValue(of(mockProductDetail));

      component.form.patchValue({
        sku: 'IPH-16PM-256',
        name: 'iPhone 16 Pro Max',
        slug: 'iphone-16-pro-max',
        categoryId: 'cat-1',
        brandId: 'brand-1',
        statusCode: 'active',
        isFeatured: true,
        price: 42500,
        costPrice: 34000,
        shortDescription: 'Smartphone flagship Apple',
      });

      component.onSubmit();

      expect(productsServiceSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          sku: 'IPH-16PM-256',
          name: 'iPhone 16 Pro Max',
          slug: 'iphone-16-pro-max',
          categoryId: 'cat-1',
          brandId: 'brand-1',
          statusCode: 'active',
          isFeatured: true,
          price: 42500,
          costPrice: 34000,
          shortDescription: 'Smartphone flagship Apple',
        })
      );
      expect(snackBarSpy.open).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/inventory/products']);
    });

    it('debe marcar error serverConflict en el campo SKU cuando el backend retorna 409 por SKU duplicado', () => {
      productsServiceSpy.create.and.returnValue(
        throwError(() => ({
          status: 409,
          error: { message: 'Ya existe un producto registrado con el SKU "LAP-MBP16"' },
        }))
      );

      component.form.patchValue({
        sku: 'LAP-MBP16',
        name: 'MacBook Pro 16',
        categoryId: 'cat-1',
        brandId: 'brand-1',
        price: 50000,
      });

      component.onSubmit();

      expect(component.form.controls.sku.errors?.['serverConflict']).toContain('LAP-MBP16');
      expect(component.errorMessage()).toContain('LAP-MBP16');
    });
  });

  describe('Modo Edición (/admin/inventory/products/:id/edit)', () => {
    beforeEach(() => {
      createTestBed({ id: 'prod-1' });
    });

    it('debe cargar el detalle del producto y precargar todos los controles del formulario', () => {
      expect(component.isEditMode()).toBeTrue();
      expect(component.productId()).toBe('prod-1');
      expect(productsServiceSpy.getById).toHaveBeenCalledWith('prod-1');

      expect(component.form.controls.sku.value).toBe('LAP-MBP16');
      expect(component.form.controls.name.value).toBe('MacBook Pro 16 M3 Max');
      expect(component.form.controls.price.value).toBe(68500);
      expect(component.form.controls.costPrice.value).toBe(51375);
      expect(component.grossMarginPercent).toBeCloseTo(25, 1);
    });

    it('debe enviar PATCH /products/:id sin sobreescribir images ni attributes al guardar cambios', () => {
      productsServiceSpy.update.and.returnValue(of(mockProductDetail));

      component.form.patchValue({
        name: 'MacBook Pro 16 M3 Max (2026)',
      });

      component.onSubmit();

      expect(productsServiceSpy.update).toHaveBeenCalledWith(
        'prod-1',
        jasmine.objectContaining({
          sku: 'LAP-MBP16',
          name: 'MacBook Pro 16 M3 Max (2026)',
          price: 68500,
        })
      );

      const sentPayload = productsServiceSpy.update.calls.mostRecent().args[1];
      expect(sentPayload.images).toBeUndefined();
      expect(sentPayload.attributes).toBeUndefined();
      expect(productsServiceSpy.setStatus).not.toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/inventory/products']);
    });

    it('debe encadenar setStatus si el usuario modificó el estado durante la edición', () => {
      productsServiceSpy.update.and.returnValue(of(mockProductDetail));
      productsServiceSpy.setStatus.and.returnValue(
        of({ ...mockProductDetail, statusCode: 'draft' })
      );

      component.form.patchValue({
        statusCode: 'draft',
      });

      component.onSubmit();

      expect(productsServiceSpy.update).toHaveBeenCalled();
      expect(productsServiceSpy.setStatus).toHaveBeenCalledWith('prod-1', 'draft');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/inventory/products']);
    });
  });
});
