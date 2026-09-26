import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent>>;

  const mockData: ConfirmDialogData = {
    title: 'Confirmar Acción',
    message: '¿Estás seguro de continuar?',
    confirmText: 'Sí, continuar',
    cancelText: 'No, cancelar',
    isDestructive: false,
  };

  beforeEach(() => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
      imports: [ConfirmDialogComponent],
    });

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y mostrar título y mensaje', () => {
    expect(component).toBeTruthy();
    const title = fixture.nativeElement.querySelector('h2');
    const msg = fixture.nativeElement.querySelector('p');
    expect(title.textContent.trim()).toBe('Confirmar Acción');
    expect(msg.textContent.trim()).toBe('¿Estás seguro de continuar?');
  });

  it('onConfirm() debe cerrar el diálogo con true', () => {
    component.onConfirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('onCancel() debe cerrar el diálogo con false', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
