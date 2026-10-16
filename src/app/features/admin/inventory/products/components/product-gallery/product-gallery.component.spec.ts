import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ProductGalleryComponent } from './product-gallery.component';
import { ProductsService } from '../../../../../../core/services/products/products.service';
import { ProductImage, ProductDetail } from '../../../../../../core/models/product.models';

describe('ProductGalleryComponent', () => {
  let component: ProductGalleryComponent;
  let fixture: ComponentFixture<ProductGalleryComponent>;
  let productsServiceSpy: jasmine.SpyObj<ProductsService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockImages: ProductImage[] = [
    {
      id: 'img-1',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample1.webp',
      altText: 'Foto 1',
      displayOrder: 1,
      isPrimary: true,
    },
    {
      id: 'img-2',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample2.webp',
      altText: 'Foto 2',
      displayOrder: 2,
      isPrimary: false,
    },
  ];

  const mockProductDetail: ProductDetail = {
    id: 'prod-uuid-1',
    sku: 'TEST-SKU',
    name: 'Producto Test',
    slug: 'producto-test',
    price: 1500,
    costPrice: 1000,
    isFeatured: true,
    statusId: 'status-1',
    statusCode: 'active',
    categoryId: 'cat-1',
    categoryName: 'Categoría',
    brandId: 'brand-1',
    brandName: 'Marca',
    primaryImageUrl: 'https://res.cloudinary.com/demo/image/upload/sample1.webp',
    shortDescription: null,
    description: null,
    metaTitle: null,
    metaDescription: null,
    images: mockImages,
    attributes: [],
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  };

  beforeEach(async () => {
    productsServiceSpy = jasmine.createSpyObj('ProductsService', [
      'uploadImage',
      'removeImage',
      'update',
    ]);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ProductGalleryComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProductsService, useValue: productsServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductGalleryComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializar la lista de imágenes a partir del input initialImages', () => {
    fixture.componentRef.setInput('images', mockImages);
    fixture.detectChanges();

    expect(component.galleryImages()).toEqual(mockImages);
    expect(component.totalImagesCount()).toBe(2);
    expect(component.primaryImage()?.id).toBe('img-1');
  });

  describe('Validación de archivos y Drag & Drop', () => {
    it('debe rechazar archivos con extensiones no permitidas', () => {
      const invalidFile = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });
      const dragEvent = {
        preventDefault: jasmine.createSpy('preventDefault'),
        stopPropagation: jasmine.createSpy('stopPropagation'),
        dataTransfer: { files: [invalidFile] },
      } as unknown as DragEvent;

      component.onDrop(dragEvent);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/no es válido/),
        'Cerrar',
        jasmine.any(Object)
      );
      expect(component.localQueue().length).toBe(0);
    });

    it('debe rechazar archivos con tamaño superior a 10 MB', () => {
      const largeFile = new File(['content'], 'heavy.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

      const dragEvent = {
        preventDefault: jasmine.createSpy('preventDefault'),
        stopPropagation: jasmine.createSpy('stopPropagation'),
        dataTransfer: { files: [largeFile] },
      } as unknown as DragEvent;

      component.onDrop(dragEvent);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/supera el límite máximo permitido/),
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('debe actualizar isDragOver en dragover y dragleave', () => {
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        stopPropagation: jasmine.createSpy('stopPropagation'),
      } as unknown as DragEvent;

      component.onDragOver(event);
      expect(component.isDragOver()).toBeTrue();

      component.onDragLeave(event);
      expect(component.isDragOver()).toBeFalse();
    });
  });

  describe('Subida de imágenes en modo Edición (con productId)', () => {
    it('debe invocar uploadImage en ProductsService secuencialmente', () => {
      fixture.componentRef.setInput('productId', 'prod-uuid-1');
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const file = new File(['img-bytes'], 'new-photo.webp', { type: 'image/webp' });
      const updatedProduct: ProductDetail = {
        ...mockProductDetail,
        images: [
          ...mockImages,
          {
            id: 'img-3',
            imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample3.webp',
            altText: null,
            displayOrder: 3,
            isPrimary: false,
          },
        ],
      };

      productsServiceSpy.uploadImage.and.returnValue(of(updatedProduct));

      const event = {
        target: { files: [file], value: 'fake-path' },
      } as unknown as Event;

      component.onFileSelected(event);

      expect(productsServiceSpy.uploadImage).toHaveBeenCalledWith(
        'prod-uuid-1',
        file,
        false,
        undefined,
        3
      );
      expect(component.galleryImages().length).toBe(3);
    });
  });

  describe('Encolado local en modo Creación (sin productId)', () => {
    it('debe encolar archivos localmente y asignar isPrimary a la primera imagen', () => {
      fixture.componentRef.setInput('productId', null);
      fixture.detectChanges();

      spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/sample-blob');

      const file1 = new File(['img1'], 'photo1.webp', { type: 'image/webp' });
      const file2 = new File(['img2'], 'photo2.webp', { type: 'image/webp' });

      const event = {
        target: { files: [file1, file2], value: '' },
      } as unknown as Event;

      component.onFileSelected(event);

      expect(component.localQueue().length).toBe(2);
      expect(component.localQueue()[0].isPrimary).toBeTrue();
      expect(component.localQueue()[1].isPrimary).toBeFalse();
    });

    it('debe permitir cambiar la imagen principal localmente', () => {
      fixture.componentRef.setInput('productId', null);
      fixture.detectChanges();

      spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/sample');

      const file1 = new File(['1'], 'p1.png', { type: 'image/png' });
      const file2 = new File(['2'], 'p2.png', { type: 'image/png' });

      component.onFileSelected({ target: { files: [file1, file2], value: '' } } as unknown as Event);

      const secondQueueId = component.localQueue()[1].id;
      component.onSetPrimaryLocal(secondQueueId);

      expect(component.localQueue()[0].isPrimary).toBeFalse();
      expect(component.localQueue()[1].isPrimary).toBeTrue();
    });

    it('debe quitar una imagen de la cola local al invocar onDeleteLocalImage', () => {
      fixture.componentRef.setInput('productId', null);
      fixture.detectChanges();

      spyOn(URL, 'createObjectURL').and.returnValue('blob:sample');

      const file = new File(['content'], 'p.png', { type: 'image/png' });
      component.onFileSelected({ target: { files: [file], value: '' } } as unknown as Event);

      const qId = component.localQueue()[0].id;
      component.onDeleteLocalImage(qId);

      expect(component.localQueue().length).toBe(0);
    });
  });

  describe('Eliminación de imágenes guardadas', () => {
    it('debe solicitar confirmación modal y llamar a removeImage al confirmar', () => {
      fixture.componentRef.setInput('productId', 'prod-uuid-1');
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      dialogSpy.open.and.returnValue({
        afterClosed: () => of(true),
      } as any);

      const updatedAfterDelete: ProductDetail = {
        ...mockProductDetail,
        images: [mockImages[1]],
      };

      productsServiceSpy.removeImage.and.returnValue(of(updatedAfterDelete));

      component.onDeleteImage(mockImages[0]);

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(productsServiceSpy.removeImage).toHaveBeenCalledWith('prod-uuid-1', 'img-1');
      expect(component.galleryImages().length).toBe(1);
    });

    it('no debe llamar a removeImage si el usuario cancela en el diálogo', () => {
      fixture.componentRef.setInput('productId', 'prod-uuid-1');
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      dialogSpy.open.and.returnValue({
        afterClosed: () => of(false),
      } as any);

      component.onDeleteImage(mockImages[0]);

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(productsServiceSpy.removeImage).not.toHaveBeenCalled();
      expect(component.galleryImages().length).toBe(2);
    });
  });

  describe('Cambio de imagen principal en modo Edición', () => {
    it('debe llamar a update con el array reordenado de isPrimary', () => {
      fixture.componentRef.setInput('productId', 'prod-uuid-1');
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const updatedProduct: ProductDetail = {
        ...mockProductDetail,
        images: [
          { ...mockImages[0], isPrimary: false },
          { ...mockImages[1], isPrimary: true },
        ],
      };

      productsServiceSpy.update.and.returnValue(of(updatedProduct));

      component.onSetPrimary(mockImages[1]);

      expect(productsServiceSpy.update).toHaveBeenCalledWith('prod-uuid-1', {
        images: [
          { imageUrl: mockImages[0].imageUrl, altText: 'Foto 1', displayOrder: 1, isPrimary: false },
          { imageUrl: mockImages[1].imageUrl, altText: 'Foto 2', displayOrder: 2, isPrimary: true },
        ],
      });
      expect(component.galleryImages()[1].isPrimary).toBeTrue();
    });
  });

  describe('Modal de Previsualización Lightbox', () => {
    it('debe abrir y cerrar la imagen activa', () => {
      component.openPreview('https://example.com/photo.jpg');
      expect(component.activePreviewImage()).toBe('https://example.com/photo.jpg');

      component.closePreview();
      expect(component.activePreviewImage()).toBeNull();
    });
  });
});
