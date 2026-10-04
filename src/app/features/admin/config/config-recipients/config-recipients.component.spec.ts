import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { ConfigRecipientsComponent } from './config-recipients.component';
import { ConfigService } from '../../../../core/services/config.service';
import { AuthState } from '../../../../core/auth/auth.state';
import {
  NotificationChannel,
  NotificationRecipient,
  NotificationRecipientType,
} from '../../../../core/models/config.models';

describe('ConfigRecipientsComponent', () => {
  let component: ConfigRecipientsComponent;
  let fixture: ComponentFixture<ConfigRecipientsComponent>;
  let configServiceSpy: jasmine.SpyObj<ConfigService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let authStateSpy: jasmine.SpyObj<AuthState>;

  const mockChannels: NotificationChannel[] = [
    { id: 'chan-1', code: 'email', name: 'Correo Electrónico' },
    { id: 'chan-2', code: 'whatsapp', name: 'WhatsApp' },
  ];

  const mockRecipientTypes: NotificationRecipientType[] = [
    { id: 'type-1', code: 'admin', name: 'Administrador' },
  ];

  const mockRecipients: NotificationRecipient[] = [
    {
      id: 'rec-1',
      channelId: 'chan-1',
      channelCode: 'email',
      channelName: 'Correo Electrónico',
      recipientTypeId: 'type-1',
      recipientTypeCode: 'admin',
      recipientTypeName: 'Administrador',
      contact: 'admin@jdinversiones.com',
      label: 'Admin Principal',
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'rec-2',
      channelId: 'chan-2',
      channelCode: 'whatsapp',
      channelName: 'WhatsApp',
      recipientTypeId: 'type-1',
      recipientTypeCode: 'admin',
      recipientTypeName: 'Administrador',
      contact: '+50499887766',
      label: 'Soporte',
      isActive: true,
      createdAt: '2026-09-02T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    configServiceSpy = jasmine.createSpyObj('ConfigService', [
      'listChannels',
      'listRecipientTypes',
      'listRecipients',
      'createRecipient',
      'updateRecipient',
      'setRecipientStatus',
    ]);
    configServiceSpy.listChannels.and.returnValue(of({ channels: mockChannels }));
    configServiceSpy.listRecipientTypes.and.returnValue(of({ recipientTypes: mockRecipientTypes }));
    configServiceSpy.listRecipients.and.returnValue(of({ recipients: [...mockRecipients] }));
    configServiceSpy.createRecipient.and.returnValue(
      of({
        ...mockRecipients[0],
        id: 'rec-3',
        contact: 'nuevo@jdinversiones.com',
      })
    );
    configServiceSpy.updateRecipient.and.returnValue(
      of({
        ...mockRecipients[0],
        contact: 'editado@jdinversiones.com',
      })
    );
    configServiceSpy.setRecipientStatus.and.returnValue(
      of({
        ...mockRecipients[1],
        isActive: false,
      })
    );

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission']);
    authStateSpy.hasPermission.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ConfigRecipientsComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ConfigService, useValue: configServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: AuthState, useValue: authStateSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigRecipientsComponent);
    component = fixture.componentInstance;
    component.canEdit = true;
    fixture.detectChanges();
  });

  it('debe crearse y cargar catálogos y recipients en ngOnInit', () => {
    expect(component).toBeTruthy();
    expect(configServiceSpy.listChannels).toHaveBeenCalled();
    expect(configServiceSpy.listRecipientTypes).toHaveBeenCalled();
    expect(configServiceSpy.listRecipients).toHaveBeenCalledWith({ isActive: null });
    expect(component.recipients().length).toBe(2);
    expect(component.activeCount()).toBe(2);
  });

  it('debe re-consultar con isActive=true al cambiar el filtro de solo activos', () => {
    component.onFilterChange({ isActive: true });
    expect(component.isActiveFilter()).toBeTrue();
    expect(configServiceSpy.listRecipients).toHaveBeenCalledWith({ isActive: true });
  });

  it('debe abrir diálogo y crear contacto con POST en onCreate()', () => {
    const dialogRefSpy = {
      afterClosed: () =>
        of({
          channelId: 'chan-1',
          recipientTypeId: 'type-1',
          contact: 'nuevo@jdinversiones.com',
          label: null,
        }),
    } as MatDialogRef<any>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.onCreate();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(configServiceSpy.createRecipient).toHaveBeenCalledWith({
      channelId: 'chan-1',
      recipientTypeId: 'type-1',
      contact: 'nuevo@jdinversiones.com',
      label: null,
    });
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('debe abrir diálogo y actualizar contacto con PATCH en onEdit()', () => {
    const dialogRefSpy = {
      afterClosed: () =>
        of({
          contact: 'editado@jdinversiones.com',
          label: 'Nuevo Label',
        }),
    } as MatDialogRef<any>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.onEdit(mockRecipients[0]);

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(configServiceSpy.updateRecipient).toHaveBeenCalledWith('rec-1', {
      contact: 'editado@jdinversiones.com',
      label: 'Nuevo Label',
    });
  });

  it('debe pedir confirmación y cambiar estado con PATCH en onToggleStatus()', () => {
    const dialogRefSpy = {
      afterClosed: () => of(true),
    } as MatDialogRef<any>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.onToggleStatus(mockRecipients[1]);

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(configServiceSpy.setRecipientStatus).toHaveBeenCalledWith('rec-2', false);
    expect(snackBarSpy.open).toHaveBeenCalled();
  });

  it('debe detectar isLastActive correctamente cuando solo queda 1 activo', () => {
    expect(component.isLastActive(mockRecipients[0])).toBeFalse();

    component.activeCount.set(1);
    expect(component.isLastActive(mockRecipients[0])).toBeTrue();
  });

  it('debe manejar error 409 del backend y mostrar el mensaje en el snackbar', () => {
    const errorResponse = new HttpErrorResponse({
      status: 409,
      error: { message: 'Debe existir al menos un contacto de notificación activo en el sistema' },
    });
    configServiceSpy.setRecipientStatus.and.returnValue(throwError(() => errorResponse));

    const dialogRefSpy = {
      afterClosed: () => of(true),
    } as MatDialogRef<any>;
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.onToggleStatus(mockRecipients[0]);

    expect(component.isMutating()).toBeFalse();
    expect(component.errorMessage()).toBe(
      'Debe existir al menos un contacto de notificación activo en el sistema'
    );
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Debe existir al menos un contacto de notificación activo en el sistema',
      'Entendido',
      jasmine.any(Object)
    );
  });

  it('no debe renderizar app-pagination en el template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const pagination = compiled.querySelector('app-pagination');
    expect(pagination).toBeNull();
  });
});
