import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UserFormComponent } from './user-form.component';
import { UsersService } from '../../../../core/services/users.service';
import { ActiveRole, CreateUserResponse, User } from '../../../../core/models/user.models';
import { CredentialsDialogComponent } from '../dialogs/credentials-dialog/credentials-dialog.component';
import { ConfirmDialogComponent } from '../dialogs/confirm-dialog/confirm-dialog.component';

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockRoles: ActiveRole[] = [
    { roleId: 'role-1', name: 'Administrador' },
    { roleId: 'role-2', name: 'Vendedor' },
  ];

  const mockUser: User = {
    userId: 'user-1',
    entityId: 'entity-1',
    firstName: 'Ana',
    lastName: 'López',
    fullName: 'Ana López',
    email: 'ana@jdinversiones.com',
    phone: '+50499001122',
    isActive: true,
    themePreference: 'light',
    lastLoginAt: null,
    createdAt: '2026-09-01T12:00:00Z',
    roles: [{ id: 'role-1', name: 'Administrador' }],
  };

  const createTestBed = (routeParams: Record<string, any> = {}) => {
    usersServiceSpy = jasmine.createSpyObj('UsersService', [
      'listActiveRoles',
      'getById',
      'create',
      'update',
    ]);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true),
    } as any);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    usersServiceSpy.listActiveRoles.and.returnValue(of(mockRoles));
    usersServiceSpy.getById.and.returnValue(of(mockUser));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: routeParams } },
        },
      ],
      imports: [UserFormComponent],
    });

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    routerSpy = router as any;

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('Modo Creación (/admin/users/new)', () => {
    beforeEach(() => {
      createTestBed({});
    });

    it('debe inicializarse en modo creación con email habilitado y formulario inválido', () => {
      expect(component.isEditMode()).toBeFalse();
      expect(component.form.controls.email.enabled).toBeTrue();
      expect(component.form.invalid).toBeTrue();
    });

    it('debe validar que se seleccione al menos 1 rol (minRolesValidator)', () => {
      component.form.patchValue({
        email: 'nuevo@jdinversiones.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        roleIds: [],
      });

      expect(component.form.controls.roleIds.invalid).toBeTrue();
      expect(component.form.controls.roleIds.errors?.['minRoles']).toBeTruthy();

      component.toggleRole('role-1');
      expect(component.form.controls.roleIds.valid).toBeTrue();
    });

    it('debe enviar POST /users y abrir CredentialsDialog al crear exitosamente', () => {
      const mockCreateResponse: CreateUserResponse = {
        ...mockUser,
        temporaryPassword: 'TempPassword#2026',
        emailSent: true,
      };

      usersServiceSpy.create.and.returnValue(of(mockCreateResponse));
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(true),
      } as any);

      component.form.patchValue({
        email: 'nuevo@jdinversiones.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+50499112233',
        roleIds: ['role-1'],
      });

      component.onSubmit();

      expect(usersServiceSpy.create).toHaveBeenCalledWith({
        email: 'nuevo@jdinversiones.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+50499112233',
        roleIds: ['role-1'],
      });

      expect(dialogSpy.open).toHaveBeenCalledWith(
        CredentialsDialogComponent,
        jasmine.objectContaining({
          data: {
            email: mockCreateResponse.email,
            temporaryPassword: 'TempPassword#2026',
            emailSent: true,
          },
          disableClose: true,
        })
      );
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/users']);
    });
  });

  describe('Modo Edición (/admin/users/:id/edit)', () => {
    beforeEach(() => {
      createTestBed({ id: 'user-1' });
    });

    it('debe inicializarse en modo edición con email deshabilitado y datos precargados', () => {
      expect(component.isEditMode()).toBeTrue();
      expect(component.userId()).toBe('user-1');
      expect(component.form.controls.email.disabled).toBeTrue();
      expect(usersServiceSpy.getById).toHaveBeenCalledWith('user-1');

      expect(component.form.controls.firstName.value).toBe('Ana');
      expect(component.form.controls.lastName.value).toBe('López');
      expect(component.form.controls.roleIds.value).toEqual(['role-1']);
    });

    it('debe abrir ConfirmDialogComponent si se modificaron los roles antes de actualizar', () => {
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(true),
      } as any);
      usersServiceSpy.update.and.returnValue(of(mockUser));

      // Agregar un segundo rol
      component.toggleRole('role-2');

      component.onSubmit();

      expect(dialogSpy.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            title: 'Confirmar reemplazo de roles',
          }),
        })
      );

      expect(usersServiceSpy.update).toHaveBeenCalledWith('user-1', {
        firstName: 'Ana',
        lastName: 'López',
        phone: '+50499001122',
        roleIds: ['role-1', 'role-2'],
      });
    });

    it('debe llamar a update directamente sin ConfirmDialog si los roles no cambiaron', () => {
      usersServiceSpy.update.and.returnValue(of(mockUser));

      component.form.patchValue({
        firstName: 'Ana María',
      });

      component.onSubmit();

      expect(dialogSpy.open).not.toHaveBeenCalled();
      expect(usersServiceSpy.update).toHaveBeenCalledWith('user-1', {
        firstName: 'Ana María',
        lastName: 'López',
        phone: '+50499001122',
        roleIds: ['role-1'],
      });
    });
  });
});
