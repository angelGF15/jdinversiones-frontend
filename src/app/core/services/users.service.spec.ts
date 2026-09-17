import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersService } from './users.service';
import { environment } from '../../../environments/environment';
import {
  ActiveRoleRawResponse,
  CreateUserRequest,
  CreateUserResponse,
  TemporaryPasswordResponse,
  UpdateUserRequest,
  User,
  UserListQuery,
  UserListResponse,
} from '../models/user.models';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const baseUrl = `${apiUrl}/users`;

  const mockUser: User = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    entityId: '123e4567-e89b-12d3-a456-426614174001',
    firstName: 'Juan',
    lastName: 'Pérez',
    fullName: 'Juan Pérez',
    email: 'juan.perez@jdinversiones.com',
    phone: '+50499887766',
    isActive: true,
    themePreference: 'light',
    lastLoginAt: '2026-09-01T10:00:00.000Z',
    createdAt: '2026-08-20T10:00:00.000Z',
    roles: [{ id: '018f6e8b-1e5b-7c3a-8b8d-9c3f1b4a5e6f', name: 'admin' }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        UsersService,
      ],
    });

    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('list()', () => {
    it('debe aplicar paginación por defecto (page=1, limit=20) si la consulta está vacía', () => {
      const mockResponse: UserListResponse = {
        items: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.list({}).subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.method === 'GET' &&
          request.params.get('page') === '1' &&
          request.params.get('limit') === '20' &&
          !request.params.has('search') &&
          !request.params.has('roleId') &&
          !request.params.has('isActive')
        );
      });

      req.flush(mockResponse);
    });

    it('debe incluir todos los filtros cuando se proporcionan y omitir espacios en blanco', () => {
      const query: UserListQuery = {
        search: '  juan  ',
        roleId: 'role-uuid-123',
        isActive: true,
        page: 3,
        limit: 50,
      };

      service.list(query).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.method === 'GET' &&
          request.params.get('page') === '3' &&
          request.params.get('limit') === '50' &&
          request.params.get('search') === 'juan' &&
          request.params.get('roleId') === 'role-uuid-123' &&
          request.params.get('isActive') === 'true'
        );
      });

      req.flush({ items: [], total: 0, page: 3, limit: 50, totalPages: 0 });
    });

    it('debe omitir campos nulos, indefinidos o vacíos en la consulta', () => {
      const query: UserListQuery = {
        search: '   ',
        roleId: null,
        isActive: null,
      };

      service.list(query).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.method === 'GET' &&
          request.params.get('page') === '1' &&
          request.params.get('limit') === '20' &&
          !request.params.has('search') &&
          !request.params.has('roleId') &&
          !request.params.has('isActive')
        );
      });

      req.flush({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    });

    it('debe serializar isActive=false correctamente como "false"', () => {
      service.list({ isActive: false }).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.params.get('isActive') === 'false'
        );
      });

      req.flush({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    });
  });

  describe('listActiveRoles()', () => {
    it('debe mapear snake_case role_id a camelCase roleId', () => {
      const rawRoles: ActiveRoleRawResponse[] = [
        { role_id: 'role-1', name: 'admin' },
        { role_id: 'role-2', name: 'vendedor' },
      ];

      service.listActiveRoles().subscribe((roles) => {
        expect(roles).toEqual([
          { roleId: 'role-1', name: 'admin' },
          { roleId: 'role-2', name: 'vendedor' },
        ]);
      });

      const req = httpMock.expectOne(`${baseUrl}/roles`);
      expect(req.request.method).toBe('GET');
      req.flush(rawRoles);
    });
  });

  describe('getById()', () => {
    it('debe enviar GET /users/:id y retornar el usuario', () => {
      const userId = 'user-uuid-123';

      service.getById(userId).subscribe((user) => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${baseUrl}/${userId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });
  });

  describe('create()', () => {
    it('debe enviar POST /users con el payload y retornar CreateUserResponse', () => {
      const body: CreateUserRequest = {
        email: 'nuevo@jdinversiones.com',
        firstName: 'Nuevo',
        lastName: 'Usuario',
        phone: '+50499001122',
        roleIds: ['role-1'],
      };

      const mockCreateResponse: CreateUserResponse = {
        ...mockUser,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        temporaryPassword: 'TempPassword#2026',
        emailSent: true,
      };

      service.create(body).subscribe((res) => {
        expect(res).toEqual(mockCreateResponse);
        expect(res.temporaryPassword).toBe('TempPassword#2026');
        expect(res.emailSent).toBeTrue();
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockCreateResponse);
    });
  });

  describe('update()', () => {
    it('debe enviar PATCH /users/:id con los campos a actualizar', () => {
      const userId = 'user-uuid-123';
      const body: UpdateUserRequest = {
        firstName: 'Juan Modificado',
        roleIds: ['role-2'],
      };

      const updatedUser: User = {
        ...mockUser,
        firstName: 'Juan Modificado',
      };

      service.update(userId, body).subscribe((user) => {
        expect(user.firstName).toBe('Juan Modificado');
      });

      const req = httpMock.expectOne(`${baseUrl}/${userId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(updatedUser);
    });
  });

  describe('setStatus()', () => {
    it('debe enviar PATCH /users/:id/status con { isActive }', () => {
      const userId = 'user-uuid-123';

      service.setStatus(userId, false).subscribe((user) => {
        expect(user.isActive).toBeFalse();
      });

      const req = httpMock.expectOne(`${baseUrl}/${userId}/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: false });
      req.flush({ ...mockUser, isActive: false });
    });
  });

  describe('generateTemporaryPassword()', () => {
    it('debe enviar POST /users/:id/temporary-password con body vacío', () => {
      const userId = 'user-uuid-123';
      const mockResponse: TemporaryPasswordResponse = {
        userId,
        email: 'juan.perez@jdinversiones.com',
        temporaryPassword: 'NewTempPass#2026',
        message: 'Nueva contraseña temporal generada exitosamente',
      };

      service.generateTemporaryPassword(userId).subscribe((res) => {
        expect(res).toEqual(mockResponse);
        expect(res.temporaryPassword).toBe('NewTempPass#2026');
      });

      const req = httpMock.expectOne(`${baseUrl}/${userId}/temporary-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });
  });
});
