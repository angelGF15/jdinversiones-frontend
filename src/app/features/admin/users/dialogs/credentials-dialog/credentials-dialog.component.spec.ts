import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CredentialsDialogComponent, CredentialsDialogData } from './credentials-dialog.component';

describe('CredentialsDialogComponent', () => {
  let component: CredentialsDialogComponent;
  let fixture: ComponentFixture<CredentialsDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CredentialsDialogComponent>>;

  const mockData: CredentialsDialogData = {
    email: 'test@jdinversiones.com',
    temporaryPassword: 'Temp#Pass1234',
    emailSent: false,
  };

  beforeEach(() => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
      imports: [CredentialsDialogComponent],
    });

    fixture = TestBed.createComponent(CredentialsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y mostrar la contraseña temporal y el correo', () => {
    expect(component).toBeTruthy();
    const content = fixture.nativeElement.textContent;
    expect(content).toContain('test@jdinversiones.com');
    expect(content).toContain('Temp#Pass1234');
  });

  it('debe mostrar la advertencia cuando emailSent es false', () => {
    const warning = fixture.nativeElement.querySelector('.bg-amber-50');
    expect(warning).toBeTruthy();
    expect(warning.textContent).toContain('El correo no pudo enviarse automáticamente');
  });

  it('onClose() debe cerrar el diálogo emitiendo true', () => {
    component.onClose();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('copyPassword() debe activar temporalmente la señal copied', async () => {
    jasmine.clock().install();
    try {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

      await component.copyPassword();
      expect(component.copied()).toBeTrue();

      jasmine.clock().tick(2600);
      expect(component.copied()).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
