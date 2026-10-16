import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ProductStatus,
  ProductDetail,
  ProductListResponse,
  ProductListQuery,
  ExportProductQuery,
  CreateProductRequest,
  UpdateProductRequest,
  SetProductStatusRequest,
} from '../../models/product.models';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/products`;

  /**
   * Consulta el catálogo completo de estados disponibles para productos.
   * Devuelve un array plano de ProductStatus (active, inactive, draft, etc.).
   * Requiere permiso PRODUCT_VIEW.
   */
  public listStatuses(): Observable<ProductStatus[]> {
    return this.http.get<ProductStatus[]>(`${this.baseUrl}/statuses`);
  }

  /**
   * Consulta el listado paginado de productos con filtros combinados.
   * Por defecto aplica page=1 y limit=20 según la especificación del backend.
   * Requiere permiso PRODUCT_VIEW.
   */
  public list(query: ProductListQuery = {}): Observable<ProductListResponse> {
    return this.http.get<ProductListResponse>(this.baseUrl, {
      params: this.buildParams(query),
    });
  }

  /**
   * Obtiene la ficha técnica completa de un producto por su UUID (incluye imágenes y atributos).
   * Requiere permiso PRODUCT_VIEW.
   */
  public getById(id: string): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${this.baseUrl}/${id}`);
  }

  /**
   * Registra un nuevo producto en el catálogo en una sola transacción atómica,
   * incluyendo opcionalmente galería inicial y atributos técnicos.
   * Requiere permiso PRODUCT_CREATE.
   */
  public create(body: CreateProductRequest): Observable<ProductDetail> {
    return this.http.post<ProductDetail>(this.baseUrl, body);
  }

  /**
   * Actualiza parcialmente los datos de un producto existente.
   * Comportamiento atómico: si se omiten 'images' o 'attributes', se conservan;
   * si se envían arreglos (incluso vacíos), reemplazan los actuales.
   * Requiere permiso PRODUCT_EDIT.
   */
  public update(id: string, body: UpdateProductRequest): Observable<ProductDetail> {
    return this.http.patch<ProductDetail>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * Modifica el estado de un producto mediante su código catalogado (active, inactive, draft).
   * Requiere permiso PRODUCT_EDIT.
   */
  public setStatus(id: string, statusCode: string): Observable<ProductDetail> {
    const payload: SetProductStatusRequest = { statusCode };
    return this.http.patch<ProductDetail>(`${this.baseUrl}/${id}/status`, payload);
  }

  /**
   * Sube una imagen a Cloudinary y la anexa a la galería del producto.
   * Soporta hasta 10 MB (JPEG, PNG, WebP).
   * Requiere permiso PRODUCT_EDIT.
   */
  public uploadImage(
    productId: string,
    file: File,
    isPrimary?: boolean,
    altText?: string,
    displayOrder?: number
  ): Observable<ProductDetail> {
    const formData = new FormData();
    formData.append('file', file);

    if (isPrimary !== undefined && isPrimary !== null) {
      formData.append('isPrimary', String(isPrimary));
    }

    if (altText !== undefined && altText !== null && altText.trim() !== '') {
      formData.append('altText', altText.trim());
    }

    if (displayOrder !== undefined && displayOrder !== null) {
      formData.append('displayOrder', String(displayOrder));
    }

    return this.http.post<ProductDetail>(`${this.baseUrl}/${productId}/images`, formData);
  }

  /**
   * Elimina una imagen de la galería del producto.
   * Si la imagen era principal, el backend reasigna la principal automáticamente.
   * Requiere permiso PRODUCT_EDIT.
   */
  public removeImage(productId: string, imageId: string): Observable<ProductDetail> {
    return this.http.delete<ProductDetail>(`${this.baseUrl}/${productId}/images/${imageId}`);
  }

  /**
   * Exporta todos los productos filtrados (sin límite de paginación) a archivo Excel (.xlsx) o CSV (.csv).
   * Extrae el nombre de archivo del header Content-Disposition si está disponible.
   * Requiere permiso PRODUCT_EXPORT.
   */
  public export(
    query: ExportProductQuery = {},
    format: 'xlsx' | 'csv' = 'xlsx'
  ): Observable<{ blob: Blob; filename: string }> {
    const exportQuery: ExportProductQuery = { ...query, format };

    return this.http
      .get(`${this.baseUrl}/export`, {
        params: this.buildExportParams(exportQuery),
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<Blob>) => {
          const blob = response.body ?? new Blob();
          const contentDisposition = response.headers.get('content-disposition');
          let filename = `productos-${new Date().toISOString().slice(0, 10)}.${format}`;

          if (contentDisposition) {
            const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
            if (filenameStarMatch && filenameStarMatch[1]) {
              filename = decodeURIComponent(filenameStarMatch[1].trim());
            } else {
              const filenameMatch = contentDisposition.match(/filename=(?:["']?)([^"';\n]+)(?:["']?)/i);
              if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].trim().replace(/^["']|["']$/g, '');
              }
            }
          }

          return { blob, filename };
        })
      );
  }

  /**
   * Construye los HttpParams para el listado paginado (GET /products).
   */
  private buildParams(query: ProductListQuery): HttpParams {
    let params = new HttpParams()
      .set('page', (query.page ?? 1).toString())
      .set('limit', (query.limit ?? 20).toString());

    if (query.search !== undefined && query.search !== null && query.search.trim() !== '') {
      params = params.set('search', query.search.trim());
    }

    if (query.categoryId) {
      params = params.set('categoryId', query.categoryId);
    }

    if (query.brandId) {
      params = params.set('brandId', query.brandId);
    }

    if (query.isFeatured !== undefined && query.isFeatured !== null) {
      params = params.set('isFeatured', String(query.isFeatured));
    }

    if (query.isActive !== undefined && query.isActive !== null) {
      params = params.set('isActive', String(query.isActive));
    }

    if (query.statusId) {
      params = params.set('statusId', query.statusId);
    }

    if (query.statusCode) {
      params = params.set('statusCode', query.statusCode);
    }

    return params;
  }

  /**
   * Construye los HttpParams para la exportación completa (GET /products/export).
   */
  private buildExportParams(query: ExportProductQuery): HttpParams {
    let params = new HttpParams();

    if (query.format) {
      params = params.set('format', query.format);
    }

    if (query.search !== undefined && query.search !== null && query.search.trim() !== '') {
      params = params.set('search', query.search.trim());
    }

    if (query.categoryId) {
      params = params.set('categoryId', query.categoryId);
    }

    if (query.brandId) {
      params = params.set('brandId', query.brandId);
    }

    if (query.isFeatured !== undefined && query.isFeatured !== null) {
      params = params.set('isFeatured', String(query.isFeatured));
    }

    if (query.isActive !== undefined && query.isActive !== null) {
      params = params.set('isActive', String(query.isActive));
    }

    if (query.statusId) {
      params = params.set('statusId', query.statusId);
    }

    if (query.statusCode) {
      params = params.set('statusCode', query.statusCode);
    }

    return params;
  }
}
