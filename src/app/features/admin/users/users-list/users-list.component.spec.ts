import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';

import { UsersListComponent } from './users-list.component';
import { UsersService } from '../../../../core/services/users.service';
import { AuthState } from '../../../../core/auth/auth.state';
import {
  User,
  UserListResponse,
  ActiveRole,
  TemporaryPasswordResponse,
} from '../../../../core/models/user.models';
import { ConfirmDialogComponent, CredentialsDialogComponent } from '../dialogs';

describe('UsersListComponent', () => {
  let component: UsersListComponent;
  let fixture: ComponentFixture<UsersListComponent>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let authStateSpy: jasmine.SpyObj<AuthState>;
  let routerSpy: jasmine.SpyObj<Router>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let queryParamsSubject: Subject<any>;

  const mockUsers: User[] = [
    {
      userId: 'user-1',
      entityId: 'entity-1',
      firstName: 'Carlos',
      lastName: 'Gómez',
      fullName: 'Carlos Gómez',
      email: 'carlos@jdinversiones.com',
      phone: '+50499112233',
      isActive: true,
      themePreference: 'light',
      lastLoginAt: '2026-09-01T10:00:00.000Z',
      createdAt: '2026-08-15T10:00:00.000Z',
      roles: [{ id: 'role-1', name: 'Administrador' }],
    },
    {
      userId: 'admin-self',
      entityId: 'entity-1',
      firstName: 'Admin',
      lastName: 'Principal',
      fullName: 'Admin Principal',
      email: 'admin@jdinversiones.com',
      phone: '+50499887766',
      isActive: true,
      themePreference: 'dark',
      lastLoginAt: '2026-09-10T10:00:00.000Z',
      createdAt: '2026-08-01T10:00:00.000Z',
      roles: [{ id: 'role-1', name: 'Administrador' }],
    },
  ];

  const mockListResponse: UserListResponse = {
    items: mockUsers,
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockActiveRoles: ActiveRole[] = [
    { roleId: 'role-1', name: 'Administrador' },
    { roleId: 'role-2', name: 'Vendedor' },
  ];

  beforeEach(() => {
    queryParamsSubject = new Subject<any>();
    usersServiceSpy = jasmine.createSpyObj('UsersService', [
      'list',
      'listActiveRoles',
      'setStatus',
      'generateTemporaryPassword',
    ]);
    authStateSpy = jasmine.createSpyObj('AuthState', ['hasPermission', 'hasAnyPermission']);
    (authStateSpy as any).profile = signal({
      userId: 'admin-self',
      entityId: 'entity-1',
      firstName: 'Admin',
      lastName: 'Principal',
      businessName: null,
      email: 'admin@jdinversiones.com',
      themePreference: 'dark',
      lastLoginAt: null,
      roles: ['Administrador'],
      permissions: ['USER_VIEW', 'USER_CREATE', 'USER_EDIT'],
    });

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    usersServiceSpy.list.and.returnValue(of(mockListResponse));
    usersServiceSpy.listActiveRoles.and.returnValue(of(mockActiveRoles));
    authStateSpy.hasPermission.and.returnValue(true);
    authStateSpy.hasAnyPermission.and.returnValue(true);

    const mockActivatedRoute = {
      snapshot: { queryParams: {} },
      queryParams: queryParamsSubject.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: AuthState, useValue: authStateSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
      imports: [UsersListComponent],
    });

    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    routerSpy = router as any;

    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    queryParamsSubject.complete();
    component.queryState.destroy();
  });

  it('debe crearse y cargar el catálogo de roles activos', () => {
    expect(component).toBeTruthy();
    expect(usersServiceSpy.listActiveRoles).toHaveBeenCalled();
    expect(component.roleFilters().length).toBe(1);
    expect(component.roleFilters()[0].options.length).toBe(2);
  });

  it('debe listar los usuarios y actualizar las señales reactivas', () => {
    expect(usersServiceSpy.list).toHaveBeenCalled();
    expect(component.items().length).toBe(2);
    expect(component.total()).toBe(2);
    expect(component.totalPages()).toBe(1);
    expect(component.isLoading()).toBeFalse();
    expect(component.errorMessage()).toBeNull();
  });

  it('debe generar correctamente las iniciales del usuario para el avatar', () => {
    expect(component.getUserInitials(mockUsers[0])).toBe('CG');

    const singleNameUser = { ...mockUsers[0], fullName: 'Administrador' };
    expect(component.getUserInitials(singleNameUser)).toBe('AD');
  });

  it('debe navegar hacia la pantalla de edición al invocar onEditUser', () => {
    component.onEditUser(mockUsers[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/users', 'user-1', 'edit']);
  });

  it('debe manejar errores de la API asignando errorMessage y deteniendo isLoading', () => {
    usersServiceSpy.list.and.returnValue(
      throwError(() => ({
        error: { message: 'Error de conexión con el servidor' },
      }))
    );

    component.onFilterChange({ search: 'error_trigger' });
    fixture.detectChanges();

    expect(component.isLoading()).toBeFalse();
    expect(component.errorMessage()).toBe('Error de conexión con el servidor');
  });

  describe('Auto-desactivación y Estado de Usuario', () => {
    it('debe identificar correctamente si un usuario corresponde al perfil autenticado', () => {
      expect(component.isSelfUser(mockUsers[1])).toBeTrue(); // admin-self
      expect(component.isSelfUser(mockUsers[0])).toBeFalse(); // user-1
    });

    it('debe impedir la auto-desactivación de la propia cuenta y mostrar un snackbar', () => {
      component.onToggleStatus(mockUsers[1]); // admin-self

      expect(dialogSpy.open).not.toHaveBeenCalled();
      expect(usersServiceSpy.setStatus).not.toHaveBeenCalled();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'No puedes desactivar tu propia cuenta de usuario.',
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('no debe llamar al servicio si el usuario cancela el diálogo de confirmación', () => {
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(false),
      } as MatDialogRef<any>);

      component.onToggleStatus(mockUsers[0]);

      expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmDialogComponent, jasmine.any(Object));
      expect(usersServiceSpy.setStatus).not.toHaveBeenCalled();
    });

    it('debe desactivar el usuario y actualizar reactivamente el signal items al confirmar', () => {
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<any>);

      const updatedUser: User = { ...mockUsers[0], isActive: false };
      usersServiceSpy.setStatus.and.returnValue(of(updatedUser));

      component.onToggleStatus(mockUsers[0]);

      expect(dialogSpy.open).toHaveBeenCalledWith(
        ConfirmDialogComponent,
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            title: 'Desactivar usuario',
            isDestructive: true,
          }),
        })
      );
      expect(usersServiceSpy.setStatus).toHaveBeenCalledWith('user-1', false);

      const targetUser = component.items().find((u) => u.userId === 'user-1');
      expect(targetUser?.isActive).toBeFalse();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/desactivado exitosamente/),
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('debe manejar error de último administrador (409) al desactivar y notificar con snackbar', () => {
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<any>);

      usersServiceSpy.setStatus.and.returnValue(
        throwError(() => ({
          status: 409,
          error: { message: 'No es posible desactivar al único administrador activo.' },
        }))
      );

      component.onToggleStatus(mockUsers[0]);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'No es posible desactivar al único administrador activo.',
        'Cerrar',
        jasmine.any(Object)
      );
    });
  });

  describe('Regeneración de Contraseña Temporal', () => {
    it('no debe llamar a generateTemporaryPassword si el diálogo es cancelado', () => {
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(false),
      } as MatDialogRef<any>);

      component.onGenerateTemporaryPassword(mockUsers[0]);

      expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmDialogComponent, jasmine.any(Object));
      expect(usersServiceSpy.generateTemporaryPassword).not.toHaveBeenCalled();
    });

    it('debe regenerar la contraseña y abrir CredentialsDialogComponent con emailSent: false', () => {
      const mockTempPassResponse: TemporaryPasswordResponse = {
        userId: 'user-1',
        email: 'carlos@jdinversiones.com',
        temporaryPassword: 'TMP-Secret-456!',
        message: 'Contraseña temporal regenerada con éxito',
      };

      dialogSpy.open.and.callFake((comp: any) => {
        if (comp === ConfirmDialogComponent) {
          return { afterClosed: () => of(true) } as MatDialogRef<any>;
        }
        return {} as MatDialogRef<any>;
      });

      usersServiceSpy.generateTemporaryPassword.and.returnValue(of(mockTempPassResponse));

      component.onGenerateTemporaryPassword(mockUsers[0]);

      expect(usersServiceSpy.generateTemporaryPassword).toHaveBeenCalledWith('user-1');
      expect(dialogSpy.open).toHaveBeenCalledWith(
        CredentialsDialogComponent,
        jasmine.objectContaining({
          data: {
            email: 'carlos@jdinversiones.com',
            temporaryPassword: 'TMP-Secret-456!',
            emailSent: false,
          },
          disableClose: true,
        })
      );
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Nueva contraseña temporal generada correctamente.',
        'Cerrar',
        jasmine.any(Object)
      );
    });

    it('debe manejar error al regenerar contraseña temporal y mostrar snackbar', () => {
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(true),
      } as MatDialogRef<any>);

      usersServiceSpy.generateTemporaryPassword.and.returnValue(
        throwError(() => ({
          status: 400,
          error: { message: 'El usuario se encuentra inactivo.' },
        }))
      );

      component.onGenerateTemporaryPassword(mockUsers[0]);

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'El usuario se encuentra inactivo.',
        'Cerrar',
        jasmine.any(Object)
      );
    });
  });
});
