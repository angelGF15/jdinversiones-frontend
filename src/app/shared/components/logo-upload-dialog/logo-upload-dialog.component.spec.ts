import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import {
  LogoUploadDialogComponent,
  LogoUploadDialogData,
} from './logo-upload-dialog.component';
import { ConfigService } from '../../../core/services/config.service';
import { BrandService } from '../../../core/services/brand.service';

describe('LogoUploadDialogComponent', () => {
  let component: LogoUploadDialogComponent;
  let fixture: ComponentFixture<LogoUploadDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<LogoUploadDialogComponent>>;
  let configServiceSpy: jasmine.SpyObj<ConfigService>;
  let brandServiceSpy: jasmine.SpyObj<BrandService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const initialData: LogoUploadDialogData = {
    currentLogoUrl: 'https://example.com/logo-actual.webp',
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    configServiceSpy = jasmine.createSpyObj('ConfigService', ['uploadLogo']);
    configServiceSpy.uploadLogo.and.returnValue(
      of({ logoUrl: 'https://cdn.example.com/nuevo-logo.webp' })
    );

    brandServiceSpy = jasmine.createSpyObj('BrandService', ['refresh']);
    brandServiceSpy.refresh.and.returnValue(of(null));

    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [LogoUploadDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: initialData },
        { provide: ConfigService, useValue: configServiceSpy },
        { provide: BrandService, useValue: brandServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LogoUploadDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar el logo actual recibido por MAT_DIALOG_DATA', () => {
    expect(component).toBeTruthy();
    expect(component.currentLogoUrl()).toBe('https://example.com/logo-actual.webp');
    expect(component.hasNewSelection()).toBeFalse();
  });

  it('debe rechazar archivos con tipo MIME no permitido', () => {
    const fakeFile = new File(['text content'], 'document.pdf', { type: 'application/pdf' });
    const event = {
      target: {
        files: [fakeFile],
        value: '',
      },
    } as unknown as Event;

    component.onFileSelected(event);

    expect(component.errorMessage()).toContain('Formato no permitido');
    expect(component.selectedFile()).toBeNull();
  });

  it('debe rechazar archivos que superen los 2 MB', () => {
    // 2.5 MB
    const largeBlob = new Uint8Array(2.5 * 1024 * 1024);
    const largeFile = new File([largeBlob], 'heavy-logo.png', { type: 'image/png' });
    const event = {
      target: {
        files: [largeFile],
        value: '',
      },
    } as unknown as Event;

    component.onFileSelected(event);

    expect(component.errorMessage()).toContain('supera el tamaño máximo');
    expect(component.selectedFile()).toBeNull();
  });

  it('debe permitir cancelar y cerrar el modal con null', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });

  it('debe limpiar la selección con onClearSelection', () => {
    component.previewUrl.set('blob:http://localhost/fake-uuid');
    component.selectedFile.set(new File([''], 'logo.png', { type: 'image/png' }));
    component.errorMessage.set('Error previo');

    component.onClearSelection();

    expect(component.previewUrl()).toBeNull();
    expect(component.selectedFile()).toBeNull();
    expect(component.errorMessage()).toBeNull();
  });

  it('debe subir el archivo seleccionado en onSave y notificar', () => {
    const file = new File(['image'], 'logo.webp', { type: 'image/webp' });
    component.selectedFile.set(file);

    component.onSave();

    expect(configServiceSpy.uploadLogo).toHaveBeenCalledWith(file);
    expect(brandServiceSpy.refresh).toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      logoUrl: 'https://cdn.example.com/nuevo-logo.webp',
    });
  });

  it('debe manejar errores de subida y mostrar el mensaje en el modal', () => {
    const errorResponse = new HttpErrorResponse({
      status: 413,
      error: { message: 'Archivo demasiado grande' },
    });
    configServiceSpy.uploadLogo.and.returnValue(throwError(() => errorResponse));

    const file = new File(['image'], 'logo.webp', { type: 'image/webp' });
    component.selectedFile.set(file);

    component.onSave();

    expect(component.isUploading()).toBeFalse();
    expect(component.errorMessage()).toContain('tamaño máximo');
  });

  it('debe formatear adecuadamente el tamaño del archivo', () => {
    expect(component.formatFileSize(500)).toBe('500 B');
    expect(component.formatFileSize(2048)).toBe('2.0 KB');
    expect(component.formatFileSize(1572864)).toBe('1.50 MB');
  });
});
