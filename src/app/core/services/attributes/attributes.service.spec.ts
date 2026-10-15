import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AttributesService } from './attributes.service';
import { environment } from '../../../../environments/environment';
import {
  AttributeListQuery,
  AttributeListResponse,
  CatalogAttribute,
  CreateAttributeRequest,
  UpdateAttributeRequest,
} from '../../models/attribute.models';

describe('AttributesService', () => {
  let service: AttributesService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const baseUrl = `${apiUrl}/attributes`;

  const mockAttribute: CatalogAttribute = {
    id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d0e',
    name: 'Color',
    description: 'Color o tono del artículo',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-10-10T12:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        AttributesService,
      ],
    });

    service = TestBed.inject(AttributesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('list()', () => {
    it('debe aplicar paginación por defecto (page=1, limit=50) si la consulta está vacía', () => {
      const mockResponse: AttributeListResponse = {
        items: [mockAttribute],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      service.list().subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.method === 'GET' &&
          request.params.get('page') === '1' &&
          request.params.get('limit') === '50' &&
          !request.params.has('isActive')
        );
      });

      req.flush(mockResponse);
    });

    it('debe incluir isActive=true cuando se especifica en la consulta', () => {
      const query: AttributeListQuery = {
        isActive: true,
        page: 2,
        limit: 25,
      };

      service.list(query).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.method === 'GET' &&
          request.params.get('page') === '2' &&
          request.params.get('limit') === '25' &&
          request.params.get('isActive') === 'true'
        );
      });

      expect(req.request.params.get('isActive')).toBe('true');
      req.flush({ items: [], total: 0, page: 2, limit: 25, totalPages: 0 });
    });

    it('debe serializar isActive=false correctamente', () => {
      service.list({ isActive: false }).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.params.get('isActive') === 'false'
        );
      });

      expect(req.request.params.get('isActive')).toBe('false');
      req.flush({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    });
  });

  describe('listActive()', () => {
    it('debe solicitar limit=100 e isActive=true y devolver únicamente el array items', () => {
      const mockAttributes: CatalogAttribute[] = [
        mockAttribute,
        {
          id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d0f',
          name: 'Talla',
          description: 'Talla de ropa o calzado',
          displayOrder: 2,
          isActive: true,
        },
      ];

      const mockResponse: AttributeListResponse = {
        items: mockAttributes,
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1,
      };

      service.listActive().subscribe((items) => {
        expect(items).toEqual(mockAttributes);
        expect(items.length).toBe(2);
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.method === 'GET' &&
          request.params.get('page') === '1' &&
          request.params.get('limit') === '100' &&
          request.params.get('isActive') === 'true'
        );
      });

      req.flush(mockResponse);
    });
  });

  describe('getById()', () => {
    it('debe enviar GET /attributes/:id y retornar el atributo', () => {
      const attributeId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d0e';

      service.getById(attributeId).subscribe((res) => {
        expect(res).toEqual(mockAttribute);
      });

      const req = httpMock.expectOne(`${baseUrl}/${attributeId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAttribute);
    });

    it('debe propagar error 404 si el atributo no existe', () => {
      const attributeId = 'non-existent-id';

      service.getById(attributeId).subscribe({
        next: () => fail('Se esperaba error 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${attributeId}`);
      req.flush(
        { statusCode: 404, message: 'Atributo no encontrado' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });

  describe('create()', () => {
    it('debe enviar POST /attributes con el cuerpo correspondiente y retornar el atributo creado', () => {
      const body: CreateAttributeRequest = {
        name: 'Memoria RAM',
        description: 'Capacidad de memoria RAM',
        displayOrder: 3,
      };

      const created: CatalogAttribute = {
        ...mockAttribute,
        id: 'new-attr-uuid',
        name: body.name,
        description: body.description ?? null,
        displayOrder: body.displayOrder ?? 0,
      };

      service.create(body).subscribe((res) => {
        expect(res).toEqual(created);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(created);
    });

    it('debe propagar error 409 Conflict si ya existe un atributo con el mismo nombre', () => {
      const body: CreateAttributeRequest = { name: 'Color' };

      service.create(body).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain('Ya existe un atributo registrado con el nombre');
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(
        { statusCode: 409, message: 'Ya existe un atributo registrado con el nombre "Color"' },
        { status: 409, statusText: 'Conflict' }
      );
    });

    it('debe propagar error 400 Bad Request si la validación falla', () => {
      const body: CreateAttributeRequest = { name: '' };

      service.create(body).subscribe({
        next: () => fail('Se esperaba error 400'),
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(
        { statusCode: 400, message: 'El nombre es obligatorio' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('update()', () => {
    it('debe enviar PATCH /attributes/:id con los campos actualizados', () => {
      const attributeId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d0e';
      const body: UpdateAttributeRequest = {
        name: 'Color Primario',
        displayOrder: 5,
      };

      const updated: CatalogAttribute = {
        ...mockAttribute,
        name: 'Color Primario',
        displayOrder: 5,
      };

      service.update(attributeId, body).subscribe((res) => {
        expect(res).toEqual(updated);
      });

      const req = httpMock.expectOne(`${baseUrl}/${attributeId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(updated);
    });

    it('debe propagar error 409 Conflict si el nuevo nombre colisiona', () => {
      const attributeId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d0e';
      const body: UpdateAttributeRequest = { name: 'Talla' };

      service.update(attributeId, body).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${attributeId}`);
      req.flush(
        { statusCode: 409, message: 'Ya existe un atributo registrado con el nombre "Talla"' },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('setStatus()', () => {
    it('debe enviar PATCH /attributes/:id/status con { isActive }', () => {
      const attributeId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d0e';

      service.setStatus(attributeId, false).subscribe((res) => {
        expect(res.isActive).toBeFalse();
      });

      const req = httpMock.expectOne(`${baseUrl}/${attributeId}/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: false });
      req.flush({ ...mockAttribute, isActive: false });
    });

    it('debe propagar error 409 Conflict si el atributo está en uso por productos', () => {
      const attributeId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d0e';

      service.setStatus(attributeId, false).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain('No se puede desactivar el atributo porque está en uso');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${attributeId}/status`);
      req.flush(
        {
          statusCode: 409,
          message: 'No se puede desactivar el atributo porque está en uso por uno o más productos',
        },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });
});
