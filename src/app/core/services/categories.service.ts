import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Category,
  CategoryChild,
  CategoryListQuery,
  CategoryListResponse,
  CreateCategoryRequest,
  SetCategoryStatusRequest,
  UpdateCategoryRequest,
} from '../models/category.models';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/categories`;

  /**
   * Consulta el listado paginado de categorías con filtros opcionales.
   * Por defecto aplica page=1 y limit=20 según la especificación del backend.
   * Requiere permiso CATEGORY_VIEW.
   */
  public list(query: CategoryListQuery = {}): Observable<CategoryListResponse> {
    return this.http.get<CategoryListResponse>(this.baseUrl, {
      params: this.buildParams(query),
    });
  }

  /**
   * Consulta categorías activas (limit: 100, isActive: true)
   * para poblar selectores jerárquicos de categoría padre en filtros y formularios.
   * Requiere permiso CATEGORY_VIEW.
   */
  public listParents(): Observable<CategoryChild[]> {
    return this.list({ page: 1, limit: 100, isActive: true }).pipe(
      map((res) => res.items)
    );
  }

  /**
   * Obtiene el detalle completo de una categoría por su identificador UUID,
   * incluyendo subcategorías directas en children[] y conteos de productos/hijos.
   * Requiere permiso CATEGORY_VIEW.
   */
  public getById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crea una nueva categoría en el catálogo.
   * El slug es autogenerado si no se envía en la petición.
   * Requiere permiso CATEGORY_CREATE.
   */
  public create(body: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(this.baseUrl, body);
  }

  /**
   * Actualiza parcialmente una categoría existente.
   * Valida unicidad de slug y previene ciclos en la jerarquía.
   * Requiere permiso CATEGORY_EDIT.
   */
  public update(id: string, body: UpdateCategoryRequest): Observable<Category> {
    return this.http.patch<Category>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * Activa o desactiva una categoría en el catálogo.
   * Falla con 409 Conflict si la categoría tiene productos asociados activos.
   * Requiere permiso CATEGORY_EDIT.
   */
  public setStatus(id: string, isActive: boolean): Observable<Category> {
    const payload: SetCategoryStatusRequest = { isActive };
    return this.http.patch<Category>(`${this.baseUrl}/${id}/status`, payload);
  }

  /**
   * Sube o actualiza la imagen representativa de la categoría en Cloudinary.
   * Envía un formulario multipart con el campo 'file'.
   * Requiere permiso CATEGORY_EDIT.
   */
  public uploadImage(id: string, file: File): Observable<Category> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Category>(`${this.baseUrl}/${id}/image`, formData);
  }

  /**
   * Construye los HttpParams de consulta para GET /categories,
   * omitiendo valores nulos o cadenas vacías.
   */
  private buildParams(query: CategoryListQuery): HttpParams {
    let params = new HttpParams()
      .set('page', (query.page ?? 1).toString())
      .set('limit', (query.limit ?? 20).toString());

    if (query.search !== undefined && query.search !== null && query.search.trim() !== '') {
      params = params.set('search', query.search.trim());
    }

    if (query.parentId !== undefined && query.parentId !== null && query.parentId.trim() !== '') {
      params = params.set('parentId', query.parentId.trim());
    }

    if (query.isActive !== undefined && query.isActive !== null) {
      params = params.set('isActive', String(query.isActive));
    }

    return params;
  }
}
