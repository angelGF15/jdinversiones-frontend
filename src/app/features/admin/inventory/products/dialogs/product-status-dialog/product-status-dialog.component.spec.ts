import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import {
  ProductStatusDialogComponent,
  ProductStatusDialogData,
} from './product-status-dialog.component';
import { ProductsService } from '../../../../../../core/services/products/products.service';
import { ProductListItem, ProductDetail } from '../../../../../../core/models/product.models';

describe('ProductStatusDialogComponent', () => {
  let component: ProductStatusDialogComponent;
  let fixture: ComponentFixture<ProductStatusDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ProductStatusDialogComponent>>;
  let productsServiceSpy: jasmine.SpyObj<ProductsService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockProduct: ProductListItem = {
    id: 'prod-uuid-1',
    sku: 'IPHONE-16',
    name: 'iPhone 16 Pro',
    slug: 'iphone-16-pro',
    price: 32000,
    costPrice: 26000,
    isFeatured: true,
    statusId: 'status-active-id',
    statusCode: 'active',
    categoryId: 'cat-1',
    categoryName: 'Smartphones',
    brandId: 'brand-1',
    brandName: 'Apple',
    primaryImageUrl: 'https://cloudinary.com/sample.webp',
    createdAt: '2026-10-15T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
  };

  const mockDialogData: ProductStatusDialogData = {
    product: mockProduct,
    statuses: [
      { id: 'st-1', code: 'active', name: 'Activo' },
      { id: 'st-2', code: 'draft', name: 'Borrador' },
      { id: 'st-3', code: 'inactive', name: 'Inactivo' },
    ],
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    productsServiceSpy = jasmine.createSpyObj('ProductsService', ['setStatus', 'listStatuses']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    productsServiceSpy.listStatuses.and.returnValue(of(mockDialogData.statuses!));

    await TestBed.configureTestingModule({
      imports: [ProductStatusDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: ProductsService, useValue: productsServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductStatusDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y preseleccionar el estado actual del producto', () => {
    expect(component).toBeTruthy();
    expect(component.selectedStatusCode()).toBe('active');
    expect(component.hasChanged()).toBeFalse();
  });

  it('debe actualizar selectedStatusCode y hasChanged al seleccionar una opción diferente', () => {
    component.selectStatus('draft');

    expect(component.selectedStatusCode()).toBe('draft');
    expect(component.hasChanged()).toBeTrue();
    expect(component.currentOption().name).toBe('Borrador');
  });

  it('debe cerrar el diálogo con null al invocar onCancel', () => {
    component.onCancel();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    expect(productsServiceSpy.setStatus).not.toHaveBeenCalled();
  });

  it('no debe ejecutar setStatus si no ha cambiado el estado', () => {
    component.onSubmit();

    expect(productsServiceSpy.setStatus).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('debe ejecutar setStatus, mostrar snackbar y cerrar retornando el producto actualizado', () => {
    const updatedProduct: ProductDetail = {
      ...mockProduct,
      statusCode: 'draft',
      shortDescription: null,
      description: null,
      metaTitle: null,
      metaDescription: null,
      images: [],
      attributes: [],
    };

    productsServiceSpy.setStatus.and.returnValue(of(updatedProduct));

    component.selectStatus('draft');
    component.onSubmit();

    expect(component.isSubmitting()).toBeFalse();
    expect(productsServiceSpy.setStatus).toHaveBeenCalledWith('prod-uuid-1', 'draft');
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringMatching(/Borrador exitosamente/),
      'Cerrar',
      jasmine.any(Object)
    );
    expect(dialogRefSpy.close).toHaveBeenCalledWith(updatedProduct);
  });

  it('debe capturar errores de la API y mostrar errorMessage sin cerrar el modal', () => {
    productsServiceSpy.setStatus.and.returnValue(
      throwError(() => ({
        error: { message: 'No se puede modificar el estado en este momento' },
      }))
    );

    component.selectStatus('inactive');
    component.onSubmit();

    expect(component.isSubmitting()).toBeFalse();
    expect(component.errorMessage()).toBe('No se puede modificar el estado en este momento');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });
});
