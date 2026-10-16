import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductsService } from './products.service';
import { environment } from '../../../../environments/environment';
import {
  ProductStatus,
  ProductDetail,
  ProductListResponse,
  ProductListQuery,
  ExportProductQuery,
  CreateProductRequest,
  UpdateProductRequest,
} from '../../models/product.models';

describe('ProductsService', () => {
  let service: ProductsService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const baseUrl = `${apiUrl}/products`;

  const mockStatuses: ProductStatus[] = [
    { id: 'status-1', code: 'active', name: 'Activo' },
    { id: 'status-2', code: 'draft', name: 'Borrador' },
    { id: 'status-3', code: 'inactive', name: 'Inactivo' },
  ];

  const mockProductDetail: ProductDetail = {
    id: '0192e456-789a-7b3c-8d4e-5f6a7b8c9d01',
    sku: 'IPHONE-16-PRO',
    name: 'iPhone 16 Pro Max 256GB',
    slug: 'iphone-16-pro-max-256gb',
    price: 32500,
    costPrice: 27000,
    isFeatured: true,
    statusId: 'status-1',
    statusCode: 'active',
    categoryId: 'cat-uuid-1',
    categoryName: 'Smartphones',
    brandId: 'brand-uuid-1',
    brandName: 'Apple',
    primaryImageUrl: 'https://res.cloudinary.com/demo/image/upload/iphone16.webp',
    shortDescription: 'Smartphone Apple de última generación',
    description: 'Chip A18 Pro, cuerpo de titanio, pantalla OLED 6.9 pulgadas.',
    metaTitle: 'Comprar iPhone 16 Pro Max - JD Inversiones',
    metaDescription: 'Adquiere tu iPhone 16 Pro Max al mejor precio con garantía oficial.',
    images: [
      {
        id: 'img-1',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/iphone16.webp',
        altText: 'iPhone 16 Pro Max Frontal',
        displayOrder: 1,
        isPrimary: true,
      },
    ],
    attributes: [
      {
        id: 'attr-item-1',
        attributeId: 'attr-uuid-storage',
        attributeName: 'Almacenamiento',
        value: '256 GB',
        displayOrder: 1,
      },
    ],
    createdAt: '2026-10-15T12:00:00.000Z',
    updatedAt: '2026-10-15T12:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ProductsService,
      ],
    });

    service = TestBed.inject(ProductsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe instanciarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('listStatuses()', () => {
    it('debe realizar GET /products/statuses y retornar el arreglo plano de estados', () => {
      service.listStatuses().subscribe((statuses) => {
        expect(statuses).toEqual(mockStatuses);
        expect(statuses.length).toBe(3);
      });

      const req = httpMock.expectOne(`${baseUrl}/statuses`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStatuses);
    });

    it('debe propagar errores HTTP cuando falla la consulta de estados', () => {
      service.listStatuses().subscribe({
        next: () => fail('Se esperaba error 500'),
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/statuses`);
      req.flush({ message: 'Error interno de base de datos' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('list()', () => {
    it('debe aplicar paginación por defecto (page=1, limit=20) si la consulta está vacía', () => {
      const mockResponse: ProductListResponse = {
        items: [mockProductDetail],
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
          !request.params.has('categoryId') &&
          !request.params.has('brandId') &&
          !request.params.has('isFeatured') &&
          !request.params.has('isActive') &&
          !request.params.has('statusId') &&
          !request.params.has('statusCode')
        );
      });

      req.flush(mockResponse);
    });

    it('debe serializar todos los filtros combinados correctamente', () => {
      const query: ProductListQuery = {
        search: '  iPhone 16  ',
        categoryId: 'cat-uuid-1',
        brandId: 'brand-uuid-1',
        isFeatured: true,
        isActive: true,
        statusId: 'status-1',
        statusCode: 'active',
        page: 3,
        limit: 15,
      };

      service.list(query).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.method === 'GET' &&
          request.params.get('page') === '3' &&
          request.params.get('limit') === '15' &&
          request.params.get('search') === 'iPhone 16' &&
          request.params.get('categoryId') === 'cat-uuid-1' &&
          request.params.get('brandId') === 'brand-uuid-1' &&
          request.params.get('isFeatured') === 'true' &&
          request.params.get('isActive') === 'true' &&
          request.params.get('statusId') === 'status-1' &&
          request.params.get('statusCode') === 'active'
        );
      });

      expect(req.request.params.get('search')).toBe('iPhone 16');
      req.flush({ items: [], total: 0, page: 3, limit: 15, totalPages: 0 });
    });

    it('debe omitir el parámetro search cuando es vacío o solo contiene espacios', () => {
      service.list({ search: '    ' }).subscribe();

      const req = httpMock.expectOne((request) => {
        return request.url === baseUrl && !request.params.has('search');
      });

      expect(req.request.params.has('search')).toBeFalse();
      req.flush({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    });

    it('debe serializar valores booleanos falsos como "false"', () => {
      service.list({ isFeatured: false, isActive: false }).subscribe();

      const req = httpMock.expectOne((request) => {
        return (
          request.url === baseUrl &&
          request.params.get('isFeatured') === 'false' &&
          request.params.get('isActive') === 'false'
        );
      });

      expect(req.request.params.get('isFeatured')).toBe('false');
      expect(req.request.params.get('isActive')).toBe('false');
      req.flush({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    });
  });

  describe('getById()', () => {
    it('debe enviar GET /products/:id y retornar la ficha técnica completa', () => {
      const productId = mockProductDetail.id;

      service.getById(productId).subscribe((res) => {
        expect(res).toEqual(mockProductDetail);
        expect(res.images.length).toBe(1);
        expect(res.attributes.length).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/${productId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProductDetail);
    });

    it('debe propagar error 404 Not Found cuando el producto no existe', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      service.getById(nonExistentId).subscribe({
        next: () => fail('Se esperaba error 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${nonExistentId}`);
      req.flush(
        { statusCode: 404, message: 'Producto no encontrado', error: 'Not Found' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });

  describe('create()', () => {
    it('debe enviar POST /products con el payload completo y retornar el producto creado', () => {
      const body: CreateProductRequest = {
        sku: 'IPHONE-16-PRO',
        name: 'iPhone 16 Pro Max 256GB',
        price: 32500,
        costPrice: 27000,
        categoryId: 'cat-uuid-1',
        brandId: 'brand-uuid-1',
        isFeatured: true,
      };

      service.create(body).subscribe((res) => {
        expect(res).toEqual(mockProductDetail);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockProductDetail);
    });

    it('debe propagar error 409 Conflict si el SKU ya existe', () => {
      const body: CreateProductRequest = {
        sku: 'IPHONE-16-PRO',
        name: 'iPhone 16 Pro Max',
        price: 32500,
        categoryId: 'cat-uuid-1',
        brandId: 'brand-uuid-1',
      };

      service.create(body).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain('Ya existe un producto registrado con el SKU');
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(
        {
          statusCode: 409,
          message: 'Ya existe un producto registrado con el SKU "IPHONE-16-PRO"',
          error: 'Conflict',
        },
        { status: 409, statusText: 'Conflict' }
      );
    });

    it('debe propagar error 400 Bad Request si la categoría o marca está inactiva', () => {
      const body: CreateProductRequest = {
        sku: 'TEST-SKU',
        name: 'Test Product',
        price: 100,
        categoryId: 'cat-inactive',
        brandId: 'brand-uuid-1',
      };

      service.create(body).subscribe({
        next: () => fail('Se esperaba error 400'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('está inactiva y no puede asignarse a productos');
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(
        {
          statusCode: 400,
          message: 'La categoría "Inactiva" está inactiva y no puede asignarse a productos',
          error: 'Bad Request',
        },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('update()', () => {
    it('debe enviar PATCH /products/:id con los campos parciales a modificar', () => {
      const productId = mockProductDetail.id;
      const body: UpdateProductRequest = {
        name: 'iPhone 16 Pro Max 512GB Actualizado',
        price: 35000,
      };

      const updatedProduct: ProductDetail = {
        ...mockProductDetail,
        name: 'iPhone 16 Pro Max 512GB Actualizado',
        price: 35000,
      };

      service.update(productId, body).subscribe((res) => {
        expect(res).toEqual(updatedProduct);
      });

      const req = httpMock.expectOne(`${baseUrl}/${productId}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(updatedProduct);
    });

    it('debe propagar error 409 Conflict si el nuevo SKU entra en colisión', () => {
      const productId = mockProductDetail.id;
      const body: UpdateProductRequest = { sku: 'EXISTING-SKU' };

      service.update(productId, body).subscribe({
        next: () => fail('Se esperaba error 409'),
        error: (error) => {
          expect(error.status).toBe(409);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${productId}`);
      req.flush(
        {
          statusCode: 409,
          message: 'Ya existe un producto registrado con el SKU "EXISTING-SKU"',
          error: 'Conflict',
        },
        { status: 409, statusText: 'Conflict' }
      );
    });
  });

  describe('setStatus()', () => {
    it('debe enviar PATCH /products/:id/status con el código de estado indicado', () => {
      const productId = mockProductDetail.id;
      const newStatus = 'inactive';

      service.setStatus(productId, newStatus).subscribe((res) => {
        expect(res.statusCode).toBe('inactive');
      });

      const req = httpMock.expectOne(`${baseUrl}/${productId}/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ statusCode: 'inactive' });
      req.flush({ ...mockProductDetail, statusCode: 'inactive' });
    });
  });

  describe('uploadImage()', () => {
    it('debe enviar POST /products/:id/images con FormData incluyendo archivo y metadatos opcionales', () => {
      const productId = mockProductDetail.id;
      const file = new File(['image-bytes'], 'phone.webp', { type: 'image/webp' });

      service.uploadImage(productId, file, true, 'Vista posterior', 2).subscribe((res) => {
        expect(res).toEqual(mockProductDetail);
      });

      const req = httpMock.expectOne(`${baseUrl}/${productId}/images`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      const formData = req.request.body as FormData;
      expect(formData.has('file')).toBeTrue();
      expect(formData.get('isPrimary')).toBe('true');
      expect(formData.get('altText')).toBe('Vista posterior');
      expect(formData.get('displayOrder')).toBe('2');

      req.flush(mockProductDetail);
    });

    it('debe funcionar cuando solo se envía el archivo sin metadatos opcionales', () => {
      const productId = mockProductDetail.id;
      const file = new File(['image-bytes'], 'phone.png', { type: 'image/png' });

      service.uploadImage(productId, file).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/${productId}/images`);
      const formData = req.request.body as FormData;
      expect(formData.has('file')).toBeTrue();
      expect(formData.has('isPrimary')).toBeFalse();
      expect(formData.has('altText')).toBeFalse();
      expect(formData.has('displayOrder')).toBeFalse();

      req.flush(mockProductDetail);
    });

    it('debe propagar error 413 si la imagen supera los 10 MB', () => {
      const productId = mockProductDetail.id;
      const file = new File(['too-big'], 'large.jpg', { type: 'image/jpeg' });

      service.uploadImage(productId, file).subscribe({
        next: () => fail('Se esperaba error 413'),
        error: (error) => {
          expect(error.status).toBe(413);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${productId}/images`);
      req.flush(
        { statusCode: 413, message: 'El archivo supera el tamaño máximo permitido (10 MB)' },
        { status: 413, statusText: 'Payload Too Large' }
      );
    });
  });

  describe('removeImage()', () => {
    it('debe enviar DELETE /products/:id/images/:imageId y retornar el producto actualizado', () => {
      const productId = mockProductDetail.id;
      const imageId = 'img-1';

      service.removeImage(productId, imageId).subscribe((res) => {
        expect(res).toEqual(mockProductDetail);
      });

      const req = httpMock.expectOne(`${baseUrl}/${productId}/images/${imageId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockProductDetail);
    });

    it('debe propagar error 404 si la imagen no existe', () => {
      const productId = mockProductDetail.id;
      const imageId = 'img-999';

      service.removeImage(productId, imageId).subscribe({
        next: () => fail('Se esperaba error 404'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/${productId}/images/${imageId}`);
      req.flush(
        { statusCode: 404, message: 'Imagen no encontrada' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });

  describe('export()', () => {
    it('debe enviar GET /products/export con format=xlsx por defecto y extraer filename de Content-Disposition con comillas', () => {
      const mockBlob = new Blob(['mock-xlsx-binary-data'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      service.export().subscribe((result) => {
        expect(result.blob).toEqual(mockBlob);
        expect(result.filename).toBe('listado-productos.xlsx');
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${baseUrl}/export` &&
          request.method === 'GET' &&
          request.params.get('format') === 'xlsx' &&
          request.responseType === 'blob'
        );
      });

      req.flush(mockBlob, {
        headers: {
          'content-disposition': 'attachment; filename="listado-productos.xlsx"',
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    });

    it('debe enviar format=csv y soportar query filters en la exportación', () => {
      const mockBlob = new Blob(['sku,name,price\nIPHONE-16-PRO,iPhone,32500'], { type: 'text/csv' });
      const query: ExportProductQuery = {
        search: 'iPhone',
        categoryId: 'cat-uuid-1',
        isFeatured: true,
        statusCode: 'active',
      };

      service.export(query, 'csv').subscribe((result) => {
        expect(result.blob).toEqual(mockBlob);
        expect(result.filename).toBe('productos_filtrados.csv');
      });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${baseUrl}/export` &&
          request.method === 'GET' &&
          request.params.get('format') === 'csv' &&
          request.params.get('search') === 'iPhone' &&
          request.params.get('categoryId') === 'cat-uuid-1' &&
          request.params.get('isFeatured') === 'true' &&
          request.params.get('statusCode') === 'active'
        );
      });

      req.flush(mockBlob, {
        headers: {
          'content-disposition': 'attachment; filename=productos_filtrados.csv',
        },
      });
    });

    it('debe extraer filename codificado en UTF-8 (RFC 5987) de Content-Disposition', () => {
      const mockBlob = new Blob(['data'], { type: 'text/csv' });

      service.export({}, 'csv').subscribe((result) => {
        expect(result.filename).toBe('productos catálogo 2026.csv');
      });

      const req = httpMock.expectOne((request) => request.url === `${baseUrl}/export`);
      req.flush(mockBlob, {
        headers: {
          'content-disposition': "attachment; filename*=UTF-8''productos%20cat%C3%A1logo%202026.csv",
        },
      });
    });

    it('debe generar un nombre con fallback predeterminado cuando falta el header Content-Disposition', () => {
      const mockBlob = new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      service.export({}, 'xlsx').subscribe((result) => {
        expect(result.filename).toMatch(/^productos-\d{4}-\d{2}-\d{2}\.xlsx$/);
      });

      const req = httpMock.expectOne((request) => request.url === `${baseUrl}/export`);
      req.flush(mockBlob, { headers: {} });
    });
  });
});
