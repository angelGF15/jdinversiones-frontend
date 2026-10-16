import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import {
  BrandLogoDialogComponent,
  BrandLogoDialogData,
  MAX_LOGO_FILE_SIZE_BYTES,
  ALLOWED_LOGO_MIME_TYPES,
} from './brand-logo-dialog.component';
import { BrandsService } from '../../../../../../core/services/brands/brands.service';
import { CatalogBrand } from '../../../../../../core/models/brand.models';

describe('BrandLogoDialogComponent', () => {
  let component: BrandLogoDialogComponent;
  let fixture: ComponentFixture<BrandLogoDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BrandLogoDialogComponent>>;
  let brandsServiceSpy: jasmine.SpyObj<BrandsService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockBrand: CatalogBrand = {
    id: 'brand-1',
    name: 'Logitech',
    slug: 'logitech',
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.webp',
    isActive: true,
    productCount: 15,
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
  };

  function setupTestBed(data: BrandLogoDialogData = { brand: mockBrand }) {
    TestBed.resetTestingModule();
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    brandsServiceSpy = jasmine.createSpyObj('BrandsService', ['uploadLogo']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [BrandLogoDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: BrandsService, useValue: brandsServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    fixture = TestBed.createComponent(BrandLogoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    setupTestBed();
  });

  describe('Inicialización y Estado', () => {
    it('debe crearse correctamente', () => {
      expect(component).toBeTruthy();
      expect(component.currentLogoUrl()).toBe(mockBrand.logoUrl);
      expect(component.previewUrl()).toBeNull();
      expect(component.selectedFile()).toBeNull();
      expect(component.hasNewSelection()).toBeFalse();
      expect(component.activeDisplayUrl()).toBe(mockBrand.logoUrl);
    });

    it('debe manejar marca sin logo previo', () => {
      const brandWithoutLogo: CatalogBrand = { ...mockBrand, logoUrl: null };
      setupTestBed({ brand: brandWithoutLogo });
      expect(component.currentLogoUrl()).toBeNull();
      expect(component.activeDisplayUrl()).toBeNull();
    });
  });

  describe('Validación de Archivos (processFile)', () => {
    it('debe rechazar archivos con formato no permitido (MIME type)', () => {
      const invalidFile = new File(['dummy content'], 'document.pdf', {
        type: 'application/pdf',
      });

      component.processFile(invalidFile);

      expect(component.errorMessage()).toContain('Formato no permitido');
      expect(component.selectedFile()).toBeNull();
      expect(component.previewUrl()).toBeNull();
      expect(component.hasNewSelection()).toBeFalse();
    });

    it('debe rechazar archivos con extensiones no soportadas como GIF', () => {
      const gifFile = new File(['dummy content'], 'animation.gif', {
        type: 'image/gif',
      });

      component.processFile(gifFile);

      expect(component.errorMessage()).toContain('Formato no permitido');
      expect(component.selectedFile()).toBeNull();
    });

    it('debe rechazar archivos que excedan el límite de 2 MB', () => {
      // 2.5 MB
      const largeFile = new File([new Uint8Array(2.5 * 1024 * 1024)], 'giant-logo.png', {
        type: 'image/png',
      });

      component.processFile(largeFile);

      expect(component.errorMessage()).toContain('supera el tamaño máximo permitido de 2 MB');
      expect(component.selectedFile()).toBeNull();
      expect(component.hasNewSelection()).toBeFalse();
    });

    it('debe aceptar archivos válidos de PNG, JPEG y WebP menores a 2 MB', () => {
      spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/mock-blob-uuid');

      for (const mime of ALLOWED_LOGO_MIME_TYPES) {
        const validFile = new File(['valid image binary'], `logo.${mime.split('/')[1]}`, {
          type: mime,
        });

        component.processFile(validFile);

        expect(component.errorMessage()).toBeNull();
        expect(component.selectedFile()).toBe(validFile);
        expect(component.previewUrl()).toBe('blob:http://localhost/mock-blob-uuid');
        expect(component.hasNewSelection()).toBeTrue();
        expect(component.activeDisplayUrl()).toBe('blob:http://localhost/mock-blob-uuid');
      }
    });
  });

  describe('Drag & Drop y Selección Manual', () => {
    it('debe actualizar isDragging en dragover y dragleave', () => {
      const dragOverEvent = new DragEvent('dragover', { cancelable: true });
      component.onDragOver(dragOverEvent);
      expect(component.isDragging()).toBeTrue();

      const dragLeaveEvent = new DragEvent('dragleave', { cancelable: true });
      component.onDragLeave(dragLeaveEvent);
      expect(component.isDragging()).toBeFalse();
    });

    it('debe procesar archivo soltado en drop', () => {
      spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/drop-blob');
      const validFile = new File(['sample content'], 'sample.webp', { type: 'image/webp' });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(validFile);
      const dropEvent = new DragEvent('drop', {
        dataTransfer,
        cancelable: true,
      });

      component.onDrop(dropEvent);

      expect(component.isDragging()).toBeFalse();
      expect(component.selectedFile()).toBe(validFile);
    });

    it('no debe procesar archivo en drop si ya está subiendo', () => {
      component.isUploading.set(true);
      const dataTransfer = new DataTransfer();
      const dropEvent = new DragEvent('drop', { dataTransfer });

      component.onDrop(dropEvent);
      expect(component.selectedFile()).toBeNull();
    });

    it('debe procesar archivo proveniente de input file en onFileSelected()', () => {
      spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/input-blob');
      const validFile = new File(['binary'], 'logo.png', { type: 'image/png' });

      const mockInput = document.createElement('input');
      mockInput.type = 'file';

      const fileList = {
        0: validFile,
        length: 1,
        item: (index: number) => validFile,
      } as unknown as FileList;

      Object.defineProperty(mockInput, 'files', {
        value: fileList,
        writable: false,
      });

      const event = { target: mockInput } as unknown as Event;
      component.onFileSelected(event);

      expect(component.selectedFile()).toBe(validFile);
      expect(mockInput.value).toBe('');
    });
  });

  describe('Limpiar Selección (onClearSelection)', () => {
    it('debe reiniciar el archivo seleccionado y la vista previa', () => {
      const revokeSpy = spyOn(URL, 'revokeObjectURL');
      spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/sample-uuid');

      const file = new File(['sample'], 'logo.png', { type: 'image/png' });
      component.processFile(file);

      expect(component.hasNewSelection()).toBeTrue();

      component.onClearSelection();

      expect(component.selectedFile()).toBeNull();
      expect(component.previewUrl()).toBeNull();
      expect(component.imageDimensions()).toBeNull();
      expect(component.errorMessage()).toBeNull();
      expect(component.hasNewSelection()).toBeFalse();
      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/sample-uuid');
    });

    it('no debe reiniciar selección si se encuentra subiendo', () => {
      component.isUploading.set(true);
      component.selectedFile.set(new File([], 'a.png'));
      component.onClearSelection();
      expect(component.selectedFile()).not.toBeNull();
    });
  });

  describe('Subida de Logotipo (onSave)', () => {
    it('no debe llamar al servicio si no hay archivo seleccionado', () => {
      component.onSave();
      expect(brandsServiceSpy.uploadLogo).not.toHaveBeenCalled();
    });

    it('debe subir el archivo y cerrar el diálogo con la marca actualizada en caso de éxito', () => {
      const file = new File(['valid'], 'logitech-new.png', { type: 'image/png' });
      spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/sample');
      component.processFile(file);

      const updatedBrand: CatalogBrand = {
        ...mockBrand,
        logoUrl: 'https://res.cloudinary.com/demo/image/upload/logitech-new.png',
      };

      brandsServiceSpy.uploadLogo.and.returnValue(of(updatedBrand));

      component.onSave();

      expect(brandsServiceSpy.uploadLogo).toHaveBeenCalledWith('brand-1', file);
      expect(component.isUploading()).toBeFalse();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringContaining('actualizado exitosamente'),
        'Cerrar',
        jasmine.any(Object)
      );
      expect(dialogRefSpy.close).toHaveBeenCalledWith(updatedBrand);
    });

    it('debe capturar errores HTTP y mostrar mensaje de error si la subida falla', () => {
      const file = new File(['valid'], 'fail.png', { type: 'image/png' });
      spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/fail');
      component.processFile(file);

      brandsServiceSpy.uploadLogo.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'Cloudinary signature expired or invalid format' },
            })
        )
      );

      component.onSave();

      expect(component.isUploading()).toBeFalse();
      expect(component.errorMessage()).toBe('Cloudinary signature expired or invalid format');
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
  });

  describe('Cancelar y Limpieza en Destrucción', () => {
    it('debe cerrar el diálogo con null en onCancel() si no está subiendo', () => {
      component.onCancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });

    it('no debe cerrar el diálogo en onCancel() si isUploading es true', () => {
      component.isUploading.set(true);
      component.onCancel();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });

    it('debe revocar URL de objeto en ngOnDestroy', () => {
      const revokeSpy = spyOn(URL, 'revokeObjectURL');
      spyOn(URL, 'createObjectURL').and.returnValue('blob:http://localhost/destroy-uuid');

      component.processFile(new File(['data'], 'logo.png', { type: 'image/png' }));
      component.ngOnDestroy();

      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/destroy-uuid');
    });
  });

  describe('formatFileSize() utility', () => {
    it('debe formatear tamaños de bytes adecuadamente', () => {
      expect(component.formatFileSize(0)).toBe('0 B');
      expect(component.formatFileSize(500)).toBe('500 B');
      expect(component.formatFileSize(1024)).toBe('1 KB');
      expect(component.formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });
  });
});
