import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CatalogBrand,
  BrandListResponse,
  BrandListQuery,
  CreateBrandRequest,
  UpdateBrandRequest,
  SetBrandStatusRequest,
} from '../../models/brand.models';

@Injectable({
  providedIn: 'root',
})
export class BrandsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/brands`;

  /**
   * Consulta el listado paginado de marcas con filtros opcionales.
   * Por defecto aplica page=1 y limit=20 según la especificación del backend.
   * Requiere permiso BRAND_VIEW.
   */
  public list(query: BrandListQuery = {}): Observable<BrandListResponse> {
    return this.http.get<BrandListResponse>(this.baseUrl, {
      params: this.buildParams(query),
    });
  }

  /**
   * Consulta marcas activas (limit: 100, isActive: true)
   * para poblar selectores de marca en filtros y formularios de productos.
   * Requiere permiso BRAND_VIEW.
   */
  public listActive(): Observable<CatalogBrand[]> {
    return this.list({ page: 1, limit: 100, isActive: true }).pipe(
      map((res) => res.items)
    );
  }

  /**
   * Obtiene el detalle completo de una marca comercial por su identificador UUID.
   * Requiere permiso BRAND_VIEW.
   */
  public getById(id: string): Observable<CatalogBrand> {
    return this.http.get<CatalogBrand>(`${this.baseUrl}/${id}`);
  }

  /**
   * Registra una nueva marca comercial en el catálogo.
   * El slug es autogenerado por el backend si se omite.
   * Requiere permiso BRAND_CREATE.
   */
  public create(body: CreateBrandRequest): Observable<CatalogBrand> {
    return this.http.post<CatalogBrand>(this.baseUrl, body);
  }

  /**
   * Actualiza parcialmente una marca comercial existente.
   * Valida unicidad de nombre y slug.
   * Requiere permiso BRAND_EDIT.
   */
  public update(id: string, body: UpdateBrandRequest): Observable<CatalogBrand> {
    return this.http.patch<CatalogBrand>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * Activa o desactiva una marca comercial en el catálogo.
   * Falla con 409 Conflict si la marca tiene productos asociados activos.
   * Requiere permiso BRAND_EDIT.
   */
  public setStatus(id: string, isActive: boolean): Observable<CatalogBrand> {
    const payload: SetBrandStatusRequest = { isActive };
    return this.http.patch<CatalogBrand>(`${this.baseUrl}/${id}/status`, payload);
  }

  /**
   * Sube o actualiza el logotipo representativo de la marca comercial en Cloudinary.
   * Envía un formulario multipart con el campo 'file'.
   * Requiere permiso BRAND_EDIT.
   */
  public uploadLogo(id: string, file: File): Observable<CatalogBrand> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CatalogBrand>(`${this.baseUrl}/${id}/logo`, formData);
  }

  /**
   * Construye los HttpParams de consulta para GET /brands,
   * omitiendo valores nulos o cadenas vacías.
   */
  private buildParams(query: BrandListQuery): HttpParams {
    let params = new HttpParams()
      .set('page', (query.page ?? 1).toString())
      .set('limit', (query.limit ?? 20).toString());

    if (query.search !== undefined && query.search !== null && query.search.trim() !== '') {
      params = params.set('search', query.search.trim());
    }

    if (query.isActive !== undefined && query.isActive !== null) {
      params = params.set('isActive', String(query.isActive));
    }

    return params;
  }
}
