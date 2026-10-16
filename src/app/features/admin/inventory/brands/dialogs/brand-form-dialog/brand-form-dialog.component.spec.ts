import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import {
  BrandFormDialogComponent,
  BrandFormData,
  slugify,
} from './brand-form-dialog.component';
import { BrandsService } from '../../../../../../core/services/brands/brands.service';
import { CatalogBrand } from '../../../../../../core/models/brand.models';

describe('BrandFormDialogComponent', () => {
  let component: BrandFormDialogComponent;
  let fixture: ComponentFixture<BrandFormDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BrandFormDialogComponent>>;
  let brandsServiceSpy: jasmine.SpyObj<BrandsService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockBrand: CatalogBrand = {
    id: 'brand-1',
    name: 'Sony Corporation',
    slug: 'sony-corporation',
    logoUrl: null,
    isActive: true,
    productCount: 10,
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
  };

  function setupTestBed(data: BrandFormData = { mode: 'create' }) {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    brandsServiceSpy = jasmine.createSpyObj('BrandsService', ['create', 'update']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [BrandFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: BrandsService, useValue: brandsServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    fixture = TestBed.createComponent(BrandFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('slugify() utility', () => {
    it('debe normalizar acentos, diacríticos y caracteres especiales', () => {
      expect(slugify('Böhm & Müller')).toBe('bohm-muller');
      expect(slugify('Café y Tecnología')).toBe('cafe-y-tecnologia');
      expect(slugify('  Sony Corporation  ')).toBe('sony-corporation');
      expect(slugify('Multiple   Spaces - and _ Underscores')).toBe('multiple-spaces-and-underscores');
      expect(slugify('100% Genuine!')).toBe('100-genuine');
    });
  });

  describe('Modo Creación', () => {
    beforeEach(() => {
      setupTestBed({ mode: 'create' });
    });

    it('debe inicializarse con formulario vacío y en modo creación', () => {
      expect(component).toBeTruthy();
      expect(component.isEdit).toBeFalse();
      expect(component.form.valid).toBeFalse();
      expect(component.form.controls.name.value).toBe('');
      expect(component.form.controls.slug.value).toBe('');
    });

    it('debe autogenerar el slug reactivamente al escribir el nombre', () => {
      component.form.controls.name.setValue('Logitech G');
      expect(component.form.controls.slug.value).toBe('logitech-g');
    });

    it('debe preservar el slug manual si el usuario lo edita directamente', () => {
      component.form.controls.name.setValue('Logitech');
      expect(component.form.controls.slug.value).toBe('logitech');

      component.onSlugManualInput();
      component.form.controls.slug.setValue('mi-slug-personalizado');

      component.form.controls.name.setValue('Logitech Gaming');
      expect(component.form.controls.slug.value).toBe('mi-slug-personalizado');
    });

    it('debe regenerar el slug al invocar resetAutoSlug()', () => {
      component.form.controls.name.setValue('Samsung Electronics');
      component.onSlugManualInput();
      component.form.controls.slug.setValue('manual');

      component.resetAutoSlug();
      expect(component.isManualSlug()).toBeFalse();
      expect(component.form.controls.slug.value).toBe('samsung-electronics');
    });

    it('debe enviar POST create() con los datos ingresados y cerrar con éxito', () => {
      const createdBrand: CatalogBrand = {
        ...mockBrand,
        id: 'brand-new',
        name: 'Asus ROG',
        slug: 'asus-rog',
      };
      brandsServiceSpy.create.and.returnValue(of(createdBrand));

      component.form.controls.name.setValue('Asus ROG');
      component.onSubmit();

      expect(brandsServiceSpy.create).toHaveBeenCalledWith({
        name: 'Asus ROG',
        slug: 'asus-rog',
      });
      expect(dialogRefSpy.close).toHaveBeenCalledWith(createdBrand);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringContaining('registrada exitosamente'),
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('debe mapear error 409 Conflict de nombre duplicado al control name', () => {
      brandsServiceSpy.create.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'Ya existe una marca registrada con el nombre "Sony"' },
            })
        )
      );

      component.form.controls.name.setValue('Sony');
      component.onSubmit();

      expect(component.form.controls.name.hasError('serverConflict')).toBeTrue();
      expect(component.form.controls.name.getError('serverConflict')).toContain('Ya existe una marca registrada');
    });

    it('debe mapear error 409 Conflict de slug duplicado al control slug', () => {
      brandsServiceSpy.create.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'Ya existe una marca registrada con el slug "sony"' },
            })
        )
      );

      component.form.controls.name.setValue('Sony Corporation');
      component.onSubmit();

      expect(component.form.controls.slug.hasError('serverConflict')).toBeTrue();
    });

    it('debe limpiar error serverConflict al modificar el campo', () => {
      component.form.controls.name.setErrors({ serverConflict: 'Conflicto previo' });
      expect(component.form.controls.name.hasError('serverConflict')).toBeTrue();

      component.form.controls.name.setValue('Nuevo Nombre');
      expect(component.form.controls.name.hasError('serverConflict')).toBeFalse();
    });
  });

  describe('Modo Edición', () => {
    beforeEach(() => {
      setupTestBed({ mode: 'edit', brand: mockBrand });
    });

    it('debe precargar los valores de la marca a editar', () => {
      expect(component.isEdit).toBeTrue();
      expect(component.form.controls.name.value).toBe('Sony Corporation');
      expect(component.form.controls.slug.value).toBe('sony-corporation');
      expect(component.form.valid).toBeTrue();
    });

    it('debe enviar PATCH update() con los datos editados y cerrar', () => {
      const updated: CatalogBrand = {
        ...mockBrand,
        name: 'Sony Interactive Entertainment',
        slug: 'sony-interactive',
      };
      brandsServiceSpy.update.and.returnValue(of(updated));

      component.form.controls.name.setValue('Sony Interactive Entertainment');
      component.form.controls.slug.setValue('sony-interactive');
      component.onSubmit();

      expect(brandsServiceSpy.update).toHaveBeenCalledWith('brand-1', {
        name: 'Sony Interactive Entertainment',
        slug: 'sony-interactive',
      });
      expect(dialogRefSpy.close).toHaveBeenCalledWith(updated);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringContaining('actualizada exitosamente'),
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('debe cerrar con null al cancelar con onCancel()', () => {
      component.onCancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });
});
