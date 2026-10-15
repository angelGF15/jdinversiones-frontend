import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import {
  AttributeFormDialogComponent,
  AttributeFormData,
} from './attribute-form-dialog.component';
import { AttributesService } from '../../../../../../core/services/attributes.service';
import { CatalogAttribute } from '../../../../../../core/models/attribute.models';

describe('AttributeFormDialogComponent', () => {
  let component: AttributeFormDialogComponent;
  let fixture: ComponentFixture<AttributeFormDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AttributeFormDialogComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let attributesServiceSpy: jasmine.SpyObj<AttributesService>;

  const mockAttribute: CatalogAttribute = {
    id: 'attr-uuid-1',
    name: 'Color',
    description: 'Tono del producto',
    displayOrder: 2,
    isActive: true,
  };

  const createComponentWithData = (data: AttributeFormData) => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    attributesServiceSpy = jasmine.createSpyObj('AttributesService', ['create', 'update']);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: AttributesService, useValue: attributesServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
      imports: [AttributeFormDialogComponent],
    });

    fixture = TestBed.createComponent(AttributeFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('Modo Creación (mode: create)', () => {
    beforeEach(() => {
      createComponentWithData({ mode: 'create' });
    });

    it('debe crearse con formulario vacío e isEdit en false', () => {
      expect(component).toBeTruthy();
      expect(component.isEdit).toBeFalse();
      expect(component.form.controls.name.value).toBe('');
      expect(component.form.controls.displayOrder.value).toBe(0);
      expect(component.form.controls.description.value).toBe('');
      expect(component.form.invalid).toBeTrue();
    });

    it('debe aplicar una sugerencia común al campo name al invocar applySuggestion()', () => {
      component.applySuggestion('Memoria RAM');
      expect(component.form.controls.name.value).toBe('Memoria RAM');
      expect(component.form.controls.name.dirty).toBeTrue();
      expect(component.form.controls.name.touched).toBeTrue();
    });

    it('debe validar que name tenga al menos 2 caracteres y no exceda 100', () => {
      component.form.controls.name.setValue('A');
      expect(component.form.controls.name.hasError('minlength')).toBeTrue();

      component.form.controls.name.setValue('A'.repeat(101));
      expect(component.form.controls.name.hasError('maxlength')).toBeTrue();

      component.form.controls.name.setValue('Talla');
      expect(component.form.controls.name.valid).toBeTrue();
    });

    it('debe validar que displayOrder sea mayor o igual a 0', () => {
      component.form.controls.displayOrder.setValue(-1);
      expect(component.form.controls.displayOrder.hasError('min')).toBeTrue();

      component.form.controls.displayOrder.setValue(5);
      expect(component.form.controls.displayOrder.valid).toBeTrue();
    });

    it('debe enviar POST create() y cerrar el diálogo al completar exitosamente', () => {
      const createdAttr: CatalogAttribute = {
        id: 'new-id',
        name: 'Material',
        description: 'Tipo de material',
        displayOrder: 3,
        isActive: true,
      };

      attributesServiceSpy.create.and.returnValue(of(createdAttr));

      component.form.setValue({
        name: 'Material',
        displayOrder: 3,
        description: 'Tipo de material',
      });

      component.onSubmit();

      expect(attributesServiceSpy.create).toHaveBeenCalledWith({
        name: 'Material',
        description: 'Tipo de material',
        displayOrder: 3,
      });
      expect(dialogRefSpy.close).toHaveBeenCalledWith(createdAttr);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/registrado exitosamente/),
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('debe marcar el control name con serverConflict si el backend devuelve 409 Conflict', () => {
      const conflictError = new HttpErrorResponse({
        error: { message: 'Ya existe un atributo registrado con el nombre "Color"' },
        status: 409,
        statusText: 'Conflict',
      });
      attributesServiceSpy.create.and.returnValue(throwError(() => conflictError));

      component.form.setValue({
        name: 'Color',
        displayOrder: 1,
        description: '',
      });

      component.onSubmit();

      expect(component.form.controls.name.hasError('serverConflict')).toBeTrue();
      expect(component.form.controls.name.getError('serverConflict')).toBe(
        'Ya existe un atributo registrado con el nombre "Color"'
      );
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
      expect(component.isSubmitting()).toBeFalse();
    });

    it('debe limpiar el error serverConflict cuando el usuario edita el campo name', () => {
      component.form.controls.name.setErrors({ serverConflict: 'Conflicto previo' });
      expect(component.form.controls.name.hasError('serverConflict')).toBeTrue();

      component.form.controls.name.setValue('Color Distinto');
      expect(component.form.controls.name.hasError('serverConflict')).toBeFalse();
    });

    it('debe registrar serverErrorMessage si el backend devuelve un error 500', () => {
      const genericError = new HttpErrorResponse({
        error: { message: 'Error interno del servidor' },
        status: 500,
        statusText: 'Internal Server Error',
      });
      attributesServiceSpy.create.and.returnValue(throwError(() => genericError));

      component.form.setValue({
        name: 'Capacidad',
        displayOrder: 0,
        description: '',
      });

      component.onSubmit();

      expect(component.serverErrorMessage()).toBe('Error interno del servidor');
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });

    it('debe cerrar el diálogo con null al invocar onCancel()', () => {
      component.onCancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });

  describe('Modo Edición (mode: edit)', () => {
    beforeEach(() => {
      createComponentWithData({ mode: 'edit', attribute: mockAttribute });
    });

    it('debe inicializar el formulario con los valores del atributo e isEdit en true', () => {
      expect(component.isEdit).toBeTrue();
      expect(component.form.controls.name.value).toBe('Color');
      expect(component.form.controls.displayOrder.value).toBe(2);
      expect(component.form.controls.description.value).toBe('Tono del producto');
      expect(component.form.valid).toBeTrue();
    });

    it('debe invocar update() al hacer submit en modo edición', () => {
      const updatedAttr: CatalogAttribute = {
        ...mockAttribute,
        name: 'Color Modificado',
        displayOrder: 10,
      };
      attributesServiceSpy.update.and.returnValue(of(updatedAttr));

      component.form.controls.name.setValue('Color Modificado');
      component.form.controls.displayOrder.setValue(10);

      component.onSubmit();

      expect(attributesServiceSpy.update).toHaveBeenCalledWith('attr-uuid-1', {
        name: 'Color Modificado',
        description: 'Tono del producto',
        displayOrder: 10,
      });
      expect(dialogRefSpy.close).toHaveBeenCalledWith(updatedAttr);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/actualizado exitosamente/),
        'Cerrar',
        jasmine.any(Object)
      );
    });
  });
});
