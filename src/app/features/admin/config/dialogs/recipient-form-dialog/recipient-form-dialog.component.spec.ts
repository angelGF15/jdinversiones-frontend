import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import {
  RecipientFormDialogComponent,
  RecipientFormDialogData,
} from './recipient-form-dialog.component';
import {
  NotificationChannel,
  NotificationRecipient,
  NotificationRecipientType,
} from '../../../../../core/models/config.models';

describe('RecipientFormDialogComponent', () => {
  let component: RecipientFormDialogComponent;
  let fixture: ComponentFixture<RecipientFormDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<RecipientFormDialogComponent>>;

  const mockChannels: NotificationChannel[] = [
    { id: 'chan-1', code: 'email', name: 'Correo Electrónico' },
    { id: 'chan-2', code: 'whatsapp', name: 'WhatsApp' },
  ];

  const mockRecipientTypes: NotificationRecipientType[] = [
    { id: 'type-1', code: 'admin', name: 'Administrador' },
  ];

  const mockRecipient: NotificationRecipient = {
    id: 'rec-1',
    channelId: 'chan-1',
    channelCode: 'email',
    channelName: 'Correo Electrónico',
    recipientTypeId: 'type-1',
    recipientTypeCode: 'admin',
    recipientTypeName: 'Administrador',
    contact: 'admin@jdinversiones.com',
    label: 'Principal',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
  };

  const setupTestBed = async (data: RecipientFormDialogData) => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [RecipientFormDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipientFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('Modo Creación (recipient === null)', () => {
    beforeEach(async () => {
      await setupTestBed({
        recipient: null,
        channels: mockChannels,
        recipientTypes: mockRecipientTypes,
      });
    });

    it('debe crearse en modo creación con campos habilitados', () => {
      expect(component.isEditMode()).toBeFalse();
      expect(component.form.controls.channelId.enabled).toBeTrue();
      expect(component.form.controls.recipientTypeId.enabled).toBeTrue();
    });

    it('no debe cerrar el diálogo si el formulario es inválido al invocar onConfirm()', () => {
      component.onConfirm();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
      expect(component.form.invalid).toBeTrue();
    });

    it('debe devolver CreateNotificationRecipientRequest con label null si está vacío', () => {
      component.form.patchValue({
        channelId: 'chan-1',
        recipientTypeId: 'type-1',
        contact: 'nuevo@jdinversiones.com',
        label: '   ',
      });

      component.onConfirm();

      expect(dialogRefSpy.close).toHaveBeenCalledWith({
        channelId: 'chan-1',
        recipientTypeId: 'type-1',
        contact: 'nuevo@jdinversiones.com',
        label: null,
      });
    });

    it('debe cerrar con null al invocar onCancel()', () => {
      component.onCancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });

  describe('Modo Edición (recipient !== null)', () => {
    beforeEach(async () => {
      await setupTestBed({
        recipient: mockRecipient,
        channels: mockChannels,
        recipientTypes: mockRecipientTypes,
      });
    });

    it('debe crearse en modo edición con canal y tipo bloqueados', () => {
      expect(component.isEditMode()).toBeTrue();
      expect(component.isChannelLocked()).toBeTrue();
      expect(component.form.controls.channelId.disabled).toBeTrue();
      expect(component.form.controls.recipientTypeId.disabled).toBeTrue();
      expect(component.form.controls.contact.value).toBe('admin@jdinversiones.com');
    });

    it('debe devolver UpdateNotificationRecipientRequest sin channelId ni recipientTypeId en onConfirm()', () => {
      component.form.patchValue({
        contact: 'modificado@jdinversiones.com',
        label: 'Nueva Etiqueta',
      });

      component.onConfirm();

      expect(dialogRefSpy.close).toHaveBeenCalledWith({
        contact: 'modificado@jdinversiones.com',
        label: 'Nueva Etiqueta',
      });
    });
  });
});
