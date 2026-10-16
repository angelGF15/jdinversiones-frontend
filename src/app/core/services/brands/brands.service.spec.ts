import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BrandsService } from './brands.service';
import { environment } from '../../../../environments/environment';
import {
  CatalogBrand,
  BrandListQuery,
  BrandListResponse,
  CreateBrandRequest,
  UpdateBrandRequest,
} from '../../models/brand.models';

describe('BrandsService', () => {
  let service: BrandsService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const baseUrl = `${apiUrl}/brands`;

  const mockBrand: CatalogBrand = {
    id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d10',
    name: 'Sony',
    slug: 'sony',
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/sample-brand.jpg',
    isActive: true,
    productCount: 12,
    createdAt: '2026-10-10T12:00:00.000Z',
    updatedAt: '2026-10-10T12:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        BrandsService,
      ],
    });

    service = TestBed.inject(BrandsService);
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
      const mockResponse: BrandListResponse = {
        items: [mockBrand],
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
          !request.params.has('isActive')
        );
      });

      req.flush(mockResponse);
    });

    it('debe incluir search e isActive cuando se proporcionan en la consulta', () => {
      const query: BrandListQuery = {
        search: 'Sony',
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
          request.params.get('search') === 'Sony' &&
          request.params.get('isActive') === 'true'
        );
      });

      expect(req.request.params.get('search')).toBe('Sony');
      expect(req.request.params.get('isActive')).toBe('true');
      req.flush({ items: [], total: 0, page: 2, limit: 10, totalPages: 0 });
    });

    it('debe ignorar search si es una cadena vacía o solo espacios', () => {
      service.list({ search: '   ' }).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url === baseUrl && !request.params.has('search');
      });

      expect(req.request.params.has('search')).toBeFalse();
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

  describe('listActive()', () => {
    it('debe solicitar limit=100 e isActive=true y devolver únicamente el array items', () => {
      const mockBrands: CatalogBrand[] = [
        mockBrand,
        {
          id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d11',
          name: 'Samsung',
          slug: 'samsung',
          logoUrl: null,
          isActive: true,
          productCount: 25,
          createdAt: '2026-10-10T12:00:00.000Z',
          updatedAt: '2026-10-10T12:00:00.000Z',
        },
      ];

      const mockResponse: BrandListResponse = {
        items: mockBrands,
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1,
      };

      service.listActive().subscribe((items) => {
        expect(items).toEqual(mockBrands);
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
    it('debe enviar GET /brands/:id y retornar el detalle de la marca', () => {
      const brandId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d10';

      service.getById(brandId).subscribe((res) => {
        expect(res).toEqual(mockBrand);
      });

      const req = httpMock.expectOne(`${baseUrl}/${brandId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockBrand);
    });

    it('debe propagar error 404 Not Found si la marca no existe', () => {
      const nonExistentId = '0192e456-789a-7b3c-8d4e-000000000000';

      service.getById(nonExistentId).subscribe({
        next: () => fail('Se esperaba error 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${nonExistentId}`);
      req.flush(
        { statusCode: 404, message: 'Marca no encontrada', error: 'Not Found' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });

  describe('create()', () => {
    it('debe enviar POST /brands con el payload y retornar la marca creada', () => {
      const body: CreateBrandRequest = {
        name: 'Apple',
        slug: 'apple',
      };

      const created: CatalogBrand = {
        ...mockBrand,
        id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d12',
        name: 'Apple',
        slug: 'apple',
      };

      service.create(body).subscribe((res) => {
        expect(res).toEqual(created);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(created);
    });

    it('debe propagar error 409 Conflict si el nombre ya existe', () => {
      const body: CreateBrandRequest = { name: 'Sony', slug: 'sony' };

      service.create(body).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain('Ya existe una marca registrada con el nombre');
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(
        {
          statusCode: 409,
          message: 'Ya existe una marca registrada con el nombre "Sony"',
          error: 'Conflict',
        },
        { status: 409, statusText: 'Conflict' }
      );
    });

    it('debe propagar error 400 Bad Request si el payload es inválido', () => {
      const body: CreateBrandRequest = { name: '' };

      service.create(body).subscribe({
        next: () => fail('Se esperaba error 400'),
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(
        { statusCode: 400, message: ['name should not be empty'], error: 'Bad Request' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('update()', () => {
    it('debe enviar PATCH /brands/:id con los campos actualizados', () => {
      const brandId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d10';
      const body: UpdateBrandRequest = {
        name: 'Sony Corporation',
      };

      const updated: CatalogBrand = {
        ...mockBrand,
        name: 'Sony Corporation',
      };

      service.update(brandId, body).subscribe((res) => {
        expect(res).toEqual(updated);
      });

      const req = httpMock.expectOne(`${baseUrl}/${brandId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(updated);
    });

    it('debe propagar error 409 Conflict si el nuevo slug o nombre entra en conflicto', () => {
      const brandId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d10';
      const body: UpdateBrandRequest = { slug: 'samsung' };

      service.update(brandId, body).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain('Ya existe una marca registrada con el slug');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${brandId}`);
      req.flush(
        {
          statusCode: 409,
          message: 'Ya existe una marca registrada con el slug "samsung"',
          error: 'Conflict',
        },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('setStatus()', () => {
    it('debe enviar PATCH /brands/:id/status con { isActive }', () => {
      const brandId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d10';

      service.setStatus(brandId, false).subscribe((res) => {
        expect(res.isActive).toBeFalse();
      });

      const req = httpMock.expectOne(`${baseUrl}/${brandId}/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: false });
      req.flush({ ...mockBrand, isActive: false });
    });

    it('debe propagar error 409 Conflict si la marca tiene productos activos asociados', () => {
      const brandId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d10';

      service.setStatus(brandId, false).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain(
            'No se puede desactivar la marca porque tiene productos asociados activos'
          );
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${brandId}/status`);
      req.flush(
        {
          statusCode: 409,
          message: 'No se puede desactivar la marca porque tiene productos asociados activos',
          error: 'Conflict',
        },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('uploadLogo()', () => {
    it('debe enviar POST /brands/:id/logo con FormData que incluye el archivo en el campo file', () => {
      const brandId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d10';
      const file = new File(['brand-logo-content'], 'logo.png', { type: 'image/png' });

      service.uploadLogo(brandId, file).subscribe((res) => {
        expect(res).toEqual(mockBrand);
      });

      const req = httpMock.expectOne(`${baseUrl}/${brandId}/logo`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      expect(req.request.body.has('file')).toBeTrue();
      req.flush(mockBrand);
    });

    it('debe propagar error 413 Payload Too Large si el archivo excede los 2 MB', () => {
      const brandId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d10';
      const file = new File(['oversized-content'], 'heavy-logo.png', { type: 'image/png' });

      service.uploadLogo(brandId, file).subscribe({
        next: () => fail('Se esperaba error 413'),
        error: (error) => {
          expect(error.status).toBe(413);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${brandId}/logo`);
      req.flush(
        { statusCode: 413, message: 'El archivo supera el tamaño máximo permitido (2 MB)' },
        { status: 413, statusText: 'Payload Too Large' }
      );
    });

    it('debe propagar error 400 Bad Request si el formato no es permitido', () => {
      const brandId = '0192e456-789a-7b3c-8d4e-5f6a7b8c9d10';
      const file = new File(['fake-gif'], 'logo.gif', { type: 'image/gif' });

      service.uploadLogo(brandId, file).subscribe({
        next: () => fail('Se esperaba error 400'),
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${brandId}/logo`);
      req.flush(
        { statusCode: 400, message: 'Formato de imagen no permitido. Solo se aceptan JPEG, PNG y WebP' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });
});
