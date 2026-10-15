import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import {
  CategoryFormDialogComponent,
  CategoryFormData,
  slugify,
} from './category-form-dialog.component';
import { CategoriesService } from '../../../../../../core/services/categories.service';
import { Category, CategoryChild } from '../../../../../../core/models/category.models';

describe('CategoryFormDialogComponent', () => {
  let component: CategoryFormDialogComponent;
  let fixture: ComponentFixture<CategoryFormDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CategoryFormDialogComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let categoriesServiceSpy: jasmine.SpyObj<CategoriesService>;

  const mockParents: CategoryChild[] = [
    {
      id: 'cat-root-1',
      name: 'Electrónica',
      slug: 'electronica',
      description: null,
      parentId: null,
      imageUrl: null,
      displayOrder: 1,
      isActive: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'cat-root-2',
      name: 'Hogar',
      slug: 'hogar',
      description: null,
      parentId: null,
      imageUrl: null,
      displayOrder: 2,
      isActive: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'cat-child-1',
      name: 'Audio',
      slug: 'audio',
      description: null,
      parentId: 'cat-root-1',
      imageUrl: null,
      displayOrder: 1,
      isActive: true,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];

  const mockCategoryToEdit: Category = {
    id: 'cat-root-1',
    name: 'Electrónica',
    slug: 'electronica',
    description: 'Todo tipo de tecnología',
    parentId: null,
    imageUrl: null,
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    children: [mockParents[2]],
  };

  const createComponentWithData = (data: CategoryFormData) => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    categoriesServiceSpy = jasmine.createSpyObj('CategoriesService', [
      'create',
      'update',
      'listParents',
    ]);
    categoriesServiceSpy.listParents.and.returnValue(of(mockParents));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: CategoriesService, useValue: categoriesServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
      imports: [CategoryFormDialogComponent],
    });

    fixture = TestBed.createComponent(CategoryFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('Función slugify', () => {
    it('debe limpiar tildes, mayúsculas, espacios y caracteres especiales', () => {
      expect(slugify('Electrónica & Computación #1')).toBe('electronica-computacion-1');
      expect(slugify('  Smartphones y Telefonía Móvil  ')).toBe('smartphones-y-telefonia-movil');
      expect(slugify('')).toBe('');
    });
  });

  describe('Modo Creación (mode: create)', () => {
    beforeEach(() => {
      createComponentWithData({ mode: 'create', parents: mockParents });
    });

    it('debe inicializarse con formulario vacío y autogenerar slug al escribir en name', () => {
      expect(component).toBeTruthy();
      expect(component.isEdit).toBeFalse();
      expect(component.form.controls.name.value).toBe('');
      expect(component.isCustomSlug()).toBeFalse();

      component.form.controls.name.setValue('Cámaras Digitales');
      expect(component.form.controls.slug.value).toBe('camaras-digitales');
    });

    it('debe respetar el slug manual si el usuario activa isCustomSlug', () => {
      component.toggleCustomSlug();
      expect(component.isCustomSlug()).toBeTrue();

      component.form.controls.name.setValue('Relojes Inteligentes');
      component.form.controls.slug.setValue('smartwatches-pro');

      expect(component.form.controls.slug.value).toBe('smartwatches-pro');
    });

    it('debe llamar a categoriesService.create() con payload limpio y cerrar diálogo', () => {
      const createdCategory: Category = {
        ...mockParents[0],
        id: 'cat-new-1',
        name: 'Relojes',
        slug: 'relojes',
      };
      categoriesServiceSpy.create.and.returnValue(of(createdCategory));

      component.form.controls.name.setValue('Relojes');
      component.form.controls.displayOrder.setValue(5);

      component.onSubmit();

      expect(categoriesServiceSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          name: 'Relojes',
          slug: 'relojes',
          displayOrder: 5,
        })
      );
      expect(dialogRefSpy.close).toHaveBeenCalledWith(createdCategory);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringContaining('registrada exitosamente'),
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('debe mapear error 409 Conflict de slug duplicado al control slug', () => {
      categoriesServiceSpy.create.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'Ya existe una categoría registrada con el slug "relojes"' },
            })
        )
      );

      component.form.controls.name.setValue('Relojes');
      component.onSubmit();

      expect(component.form.controls.slug.hasError('serverConflict')).toBeTrue();
      expect(component.form.controls.slug.getError('serverConflict')).toContain('Ya existe una categoría');
    });
  });

  describe('Modo Edición (mode: edit)', () => {
    beforeEach(() => {
      createComponentWithData({
        mode: 'edit',
        category: mockCategoryToEdit,
        parents: mockParents,
      });
    });

    it('debe precargar los valores existentes de la categoría', () => {
      expect(component.isEdit).toBeTrue();
      expect(component.form.controls.name.value).toBe('Electrónica');
      expect(component.form.controls.slug.value).toBe('electronica');
      expect(component.form.controls.description.value).toBe('Todo tipo de tecnología');
      expect(component.isCustomSlug()).toBeTrue();
    });

    it('debe prevenir ciclos jerárquicos excluyendo la categoría actual y sus descendientes', () => {
      const available = component.availableParents();
      // De las 3 mockParents, cat-root-1 es ella misma y cat-child-1 es su hijo directo -> solo debe quedar cat-root-2 (Hogar)
      expect(available.length).toBe(1);
      expect(available[0].id).toBe('cat-root-2');
    });

    it('debe llamar a categoriesService.update() con id y payload actualizado', () => {
      const updatedCategory: Category = {
        ...mockCategoryToEdit,
        name: 'Electrónica y Más',
      };
      categoriesServiceSpy.update.and.returnValue(of(updatedCategory));

      component.form.controls.name.setValue('Electrónica y Más');
      component.onSubmit();

      expect(categoriesServiceSpy.update).toHaveBeenCalledWith(
        'cat-root-1',
        jasmine.objectContaining({
          name: 'Electrónica y Más',
        })
      );
      expect(dialogRefSpy.close).toHaveBeenCalledWith(updatedCategory);
    });

    it('debe desplegar serverErrorMessage si el backend rechaza por ciclo jerárquico (400)', () => {
      categoriesServiceSpy.update.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: {
                message:
                  'Jerarquía inválida: una categoría no puede ser hija de sí misma ni generar ciclos en el árbol',
              },
            })
        )
      );

      component.onSubmit();

      expect(component.serverErrorMessage()).toContain('Jerarquía inválida');
    });
  });
});
