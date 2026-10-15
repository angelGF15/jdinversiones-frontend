import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoriesService } from './categories.service';
import { environment } from '../../../environments/environment';
import {
  Category,
  CategoryChild,
  CategoryListQuery,
  CategoryListResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../models/category.models';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const baseUrl = `${apiUrl}/categories`;

  const mockCategoryChild: CategoryChild = {
    id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01',
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Teléfonos inteligentes y accesorios',
    parentId: null,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    displayOrder: 1,
    isActive: true,
    productCount: 15,
    childrenCount: 2,
    createdAt: '2026-10-10T12:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  };

  const mockCategory: Category = {
    ...mockCategoryChild,
    children: [
      {
        id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d02',
        name: 'Gama Alta',
        slug: 'gama-alta',
        description: 'Dispositivos premium',
        parentId: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01',
        imageUrl: null,
        displayOrder: 1,
        isActive: true,
        productCount: 5,
        childrenCount: 0,
        createdAt: '2026-10-10T12:00:00.000Z',
        updatedAt: '2026-10-10T12:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        CategoriesService,
      ],
    });

    service = TestBed.inject(CategoriesService);
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
      const mockResponse: CategoryListResponse = {
        items: [mockCategoryChild],
        total: 1,
        page: 1,
        limit: 20,
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
          request.params.get('limit') === '20' &&
          !request.params.has('search') &&
          !request.params.has('parentId') &&
          !request.params.has('isActive')
        );
      });

      req.flush(mockResponse);
    });

    it('debe incluir search, parentId e isActive cuando se proporcionan en la consulta', () => {
      const query: CategoryListQuery = {
        search: 'Smart',
        parentId: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d00',
        isActive: true,
        page: 2,
        limit: 10,
      };

      service.list(query).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.method === 'GET' &&
          request.params.get('page') === '2' &&
          request.params.get('limit') === '10' &&
          request.params.get('search') === 'Smart' &&
          request.params.get('parentId') === '0192e456-789a-7b3c-8d4e-5f6a7b8c9d00' &&
          request.params.get('isActive') === 'true'
        );
      });

      expect(req.request.params.get('search')).toBe('Smart');
      expect(req.request.params.get('parentId')).toBe('0192e456-789a-7b3c-8d4e-5f6a7b8c9d00');
      expect(req.request.params.get('isActive')).toBe('true');
      req.flush({ items: [], total: 0, page: 2, limit: 10, totalPages: 0 });
    });

    it('debe ignorar search y parentId si son cadenas vacías o solo espacios', () => {
      service.list({ search: '   ', parentId: '' }).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          !request.params.has('search') &&
          !request.params.has('parentId')
        );
      });

      expect(req.request.params.has('search')).toBeFalse();
      expect(req.request.params.has('parentId')).toBeFalse();
      req.flush({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    });

    it('debe serializar isActive=false correctamente', () => {
      service.list({ isActive: false }).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url === baseUrl && request.params.get('isActive') === 'false';
      });

      expect(req.request.params.get('isActive')).toBe('false');
      req.flush({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    });
  });

  describe('listParents()', () => {
    it('debe solicitar limit=100 e isActive=true y devolver únicamente el array items', () => {
      const mockParents: CategoryChild[] = [
        mockCategoryChild,
        {
          id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d03',
          name: 'Computación',
          slug: 'computacion',
          description: null,
          parentId: null,
          imageUrl: null,
          displayOrder: 2,
          isActive: true,
          productCount: 8,
          childrenCount: 0,
          createdAt: '2026-10-10T12:00:00.000Z',
          updatedAt: '2026-10-10T12:00:00.000Z',
        },
      ];

      const mockResponse: CategoryListResponse = {
        items: mockParents,
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1,
      };

      service.listParents().subscribe((items) => {
        expect(items).toEqual(mockParents);
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
    it('debe enviar GET /categories/:id y retornar el detalle de la categoría con sus hijos', () => {
      const categoryId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01';

      service.getById(categoryId).subscribe((res) => {
        expect(res).toEqual(mockCategory);
        expect(res.children?.length).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/${categoryId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCategory);
    });

    it('debe propagar error 404 Not Found si la categoría no existe', () => {
      const nonExistentId = '0192e456-789a-7b3c-8d4e-000000000000';

      service.getById(nonExistentId).subscribe({
        next: () => fail('Se esperaba error 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${nonExistentId}`);
      req.flush(
        { statusCode: 404, message: 'Categoría no encontrada', error: 'Not Found' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });

  describe('create()', () => {
    it('debe enviar POST /categories con el payload y retornar la categoría creada', () => {
      const body: CreateCategoryRequest = {
        name: 'Laptops',
        slug: 'laptops',
        description: 'Portátiles y ultrabooks',
        displayOrder: 2,
      };

      const created: Category = {
        ...mockCategoryChild,
        id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d04',
        name: 'Laptops',
        slug: 'laptops',
        description: 'Portátiles y ultrabooks',
        displayOrder: 2,
      };

      service.create(body).subscribe((res) => {
        expect(res).toEqual(created);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(created);
    });

    it('debe propagar error 409 Conflict si el slug ya existe', () => {
      const body: CreateCategoryRequest = { name: 'Smartphones', slug: 'smartphones' };

      service.create(body).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain('Ya existe una categoría registrada con el slug');
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(
        {
          statusCode: 409,
          message: 'Ya existe una categoría registrada con el slug "smartphones"',
          error: 'Conflict',
        },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('update()', () => {
    it('debe enviar PATCH /categories/:id con los campos actualizados', () => {
      const categoryId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01';
      const body: UpdateCategoryRequest = {
        name: 'Smartphones y Telefonía',
        displayOrder: 3,
      };

      const updated: Category = {
        ...mockCategory,
        name: 'Smartphones y Telefonía',
        displayOrder: 3,
      };

      service.update(categoryId, body).subscribe((res) => {
        expect(res).toEqual(updated);
      });

      const req = httpMock.expectOne(`${baseUrl}/${categoryId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(updated);
    });

    it('debe propagar error 400 Bad Request si se genera jerarquía cíclica', () => {
      const categoryId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01';
      const body: UpdateCategoryRequest = {
        parentId: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d02',
      };

      service.update(categoryId, body).subscribe({
        next: () => fail('Se esperaba error 400'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('Jerarquía inválida');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${categoryId}`);
      req.flush(
        {
          statusCode: 400,
          message: 'Jerarquía inválida: una categoría no puede ser hija de sí misma ni generar ciclos en el árbol',
          error: 'Bad Request',
        },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('setStatus()', () => {
    it('debe enviar PATCH /categories/:id/status con { isActive }', () => {
      const categoryId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01';

      service.setStatus(categoryId, false).subscribe((res) => {
        expect(res.isActive).toBeFalse();
      });

      const req = httpMock.expectOne(`${baseUrl}/${categoryId}/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: false });
      req.flush({ ...mockCategory, isActive: false });
    });

    it('debe propagar error 409 Conflict si la categoría tiene productos activos', () => {
      const categoryId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01';

      service.setStatus(categoryId, false).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain('No se puede desactivar la categoría porque tiene productos asociados activos');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${categoryId}/status`);
      req.flush(
        {
          statusCode: 409,
          message: 'No se puede desactivar la categoría porque tiene productos asociados activos',
          error: 'Conflict',
        },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('uploadImage()', () => {
    it('debe enviar POST /categories/:id/image con FormData que incluye el archivo', () => {
      const categoryId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01';
      const file = new File(['dummy-content'], 'category.png', { type: 'image/png' });

      service.uploadImage(categoryId, file).subscribe((res) => {
        expect(res).toEqual(mockCategory);
      });

      const req = httpMock.expectOne(`${baseUrl}/${categoryId}/image`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      expect(req.request.body.has('file')).toBeTrue();
      req.flush(mockCategory);
    });

    it('debe propagar error 413 Payload Too Large si la imagen excede el límite', () => {
      const categoryId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01';
      const file = new File(['large-content'], 'large.jpg', { type: 'image/jpeg' });

      service.uploadImage(categoryId, file).subscribe({
        next: () => fail('Se esperaba error 413'),
        error: (error) => {
          expect(error.status).toBe(413);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${categoryId}/image`);
      req.flush(
        { statusCode: 413, message: 'El archivo supera el tamaño máximo permitido' },
        { status: 413, statusText: 'Payload Too Large' }
      );
    });
  });
});
