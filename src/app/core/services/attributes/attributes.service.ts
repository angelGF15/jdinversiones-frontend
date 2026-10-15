import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AttributeListQuery,
  AttributeListResponse,
  CatalogAttribute,
  CreateAttributeRequest,
  SetAttributeStatusRequest,
  UpdateAttributeRequest,
} from '../../models/attribute.models';

@Injectable({
  providedIn: 'root',
})
export class AttributesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/attributes`;

  /**
   * Consulta el listado paginado de atributos maestros.
   * Por defecto aplica page=1 y limit=50 según especificación del backend.
   * Requiere permiso ATTRIBUTE_VIEW.
   */
  public list(query: AttributeListQuery = {}): Observable<AttributeListResponse> {
    return this.http.get<AttributeListResponse>(this.baseUrl, {
      params: this.buildParams(query),
    });
  }

  /**
   * Consulta rápida de atributos activos (limit: 100, isActive: true)
   * para poblar selectores de especificaciones al crear o editar productos.
   * Requiere permiso ATTRIBUTE_VIEW.
   */
  public listActive(): Observable<CatalogAttribute[]> {
    return this.list({ page: 1, limit: 100, isActive: true }).pipe(
      map((res) => res.items)
    );
  }

  /**
   * Obtiene el detalle de un atributo específico por su identificador UUID.
   * Requiere permiso ATTRIBUTE_VIEW.
   */
  public getById(id: string): Observable<CatalogAttribute> {
    return this.http.get<CatalogAttribute>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crea un nuevo atributo maestro en el catálogo.
   * El nombre debe ser único.
   * Requiere permiso ATTRIBUTE_CREATE.
   */
  public create(body: CreateAttributeRequest): Observable<CatalogAttribute> {
    return this.http.post<CatalogAttribute>(this.baseUrl, body);
  }

  /**
   * Actualiza el nombre, descripción y/o displayOrder de un atributo existente.
   * Requiere permiso ATTRIBUTE_EDIT.
   */
  public update(id: string, body: UpdateAttributeRequest): Observable<CatalogAttribute> {
    return this.http.patch<CatalogAttribute>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * Activa o desactiva un atributo en el catálogo maestro.
   * Requiere permiso ATTRIBUTE_EDIT.
   */
  public setStatus(id: string, isActive: boolean): Observable<CatalogAttribute> {
    const payload: SetAttributeStatusRequest = { isActive };
    return this.http.patch<CatalogAttribute>(`${this.baseUrl}/${id}/status`, payload);
  }

  /**
   * Construye los HttpParams de consulta para el endpoint GET /attributes.
   * Solo incluye los parámetros soportados por el backend: page, limit e isActive.
   */
  private buildParams(query: AttributeListQuery): HttpParams {
    let params = new HttpParams()
      .set('page', (query.page ?? 1).toString())
      .set('limit', (query.limit ?? 50).toString());

    if (query.isActive !== undefined && query.isActive !== null) {
      params = params.set('isActive', String(query.isActive));
    }

    return params;
  }
}
