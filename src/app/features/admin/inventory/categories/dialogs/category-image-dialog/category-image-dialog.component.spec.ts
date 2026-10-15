import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import {
  CategoryImageDialogComponent,
  CategoryImageDialogData,
} from './category-image-dialog.component';
import { CategoriesService } from '../../../../../../core/services/categories/categories.service';
import { Category, CategoryChild } from '../../../../../../core/models/category.models';

describe('CategoryImageDialogComponent', () => {
  let component: CategoryImageDialogComponent;
  let fixture: ComponentFixture<CategoryImageDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CategoryImageDialogComponent>>;
  let categoriesServiceSpy: jasmine.SpyObj<CategoriesService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockCategory: CategoryChild = {
    id: 'cat-uuid-1',
    name: 'Smartphones',
    slug: 'smartphones',
    description: null,
    parentId: null,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/old-phone.jpg',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  const initialData: CategoryImageDialogData = {
    category: mockCategory,
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    categoriesServiceSpy = jasmine.createSpyObj('CategoriesService', ['uploadImage']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [CategoryImageDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: initialData },
        { provide: CategoriesService, useValue: categoriesServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryImageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar los datos de la categoría', () => {
    expect(component).toBeTruthy();
    expect(component.currentImageUrl()).toBe(mockCategory.imageUrl);
    expect(component.hasNewSelection()).toBeFalse();
  });

  it('debe rechazar archivos con tipo MIME no permitido', () => {
    const invalidFile = new File(['dummy'], 'document.pdf', { type: 'application/pdf' });
    component.processFile(invalidFile);

    expect(component.selectedFile()).toBeNull();
    expect(component.errorMessage()).toContain('Formato no permitido');
    expect(component.hasNewSelection()).toBeFalse();
  });

  it('debe rechazar archivos que superen los 5 MB', () => {
    const largeFile = new File([''], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    component.processFile(largeFile);

    expect(component.selectedFile()).toBeNull();
    expect(component.errorMessage()).toContain('supera el tamaño máximo');
  });

  it('debe procesar un archivo PNG válido dentro del límite de 5 MB', () => {
    const validFile = new File(['valid image content'], 'category.png', { type: 'image/png' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 100 }); // 100 KB

    component.processFile(validFile);

    expect(component.selectedFile()).toBe(validFile);
    expect(component.errorMessage()).toBeNull();
  });

  it('debe limpiar la selección con onClearSelection()', () => {
    const validFile = new File(['content'], 'category.jpg', { type: 'image/jpeg' });
    component.processFile(validFile);

    component.onClearSelection();

    expect(component.selectedFile()).toBeNull();
    expect(component.previewUrl()).toBeNull();
    expect(component.errorMessage()).toBeNull();
    expect(component.hasNewSelection()).toBeFalse();
  });

  it('debe subir la imagen con uploadImage() y cerrar el diálogo al completar', () => {
    const validFile = new File(['content'], 'phone.webp', { type: 'image/webp' });
    component.processFile(validFile);

    const updatedCategory: Category = {
      ...mockCategory,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/new-phone.webp',
    };
    categoriesServiceSpy.uploadImage.and.returnValue(of(updatedCategory));

    component.onSave();

    expect(categoriesServiceSpy.uploadImage).toHaveBeenCalledWith('cat-uuid-1', validFile);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(updatedCategory);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('actualizada exitosamente'),
      'Cerrar',
      jasmine.any(Object)
    );
  });

  it('debe manejar error del servidor al subir la imagen y registrar errorMessage', () => {
    const validFile = new File(['content'], 'phone.webp', { type: 'image/webp' });
    component.processFile(validFile);

    categoriesServiceSpy.uploadImage.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 413,
            error: { message: 'El archivo supera el tamaño máximo permitido' },
          })
      )
    );

    component.onSave();

    expect(component.isUploading()).toBeFalse();
    expect(component.errorMessage()).toBe('El archivo supera el tamaño máximo permitido');
  });

  it('debe formatear tamaños de archivo correctamente con formatFileSize()', () => {
    expect(component.formatFileSize(0)).toBe('0 B');
    expect(component.formatFileSize(1024)).toBe('1 KB');
    expect(component.formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('debe gestionar eventos de drag and drop correctamente', () => {
    const fakeDragEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
    } as unknown as DragEvent;

    component.onDragOver(fakeDragEvent);
    expect(component.isDragging()).toBeTrue();

    component.onDragLeave(fakeDragEvent);
    expect(component.isDragging()).toBeFalse();
  });
});
