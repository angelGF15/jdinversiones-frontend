import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CloneRoleRequest,
  CreateRoleRequest,
  DeleteRoleResponse,
  Role,
  RoleListItem,
  RoleListQuery,
  RoleListResponse,
  SetRoleStatusRequest,
  UpdateRoleRequest,
} from '../models/role.models';

@Injectable({
  providedIn: 'root',
})
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/roles`;

  /**
   * GET /roles — listado paginado y filtrado de roles.
   * Requiere permiso ROLE_VIEW.
   */
  public list(query: RoleListQuery): Observable<RoleListResponse> {
    return this.http.get<RoleListResponse>(this.baseUrl, {
      params: this.buildParams(query),
    });
  }

  /**
   * Catálogo completo de roles (máx 100) para dropdowns y selecciones.
   * Requiere permiso ROLE_VIEW.
   */
  public listAll(): Observable<RoleListItem[]> {
    return this.list({ page: 1, limit: 100 }).pipe(
      map((res) => res.items)
    );
  }

  /**
   * GET /roles/:id — detalle completo de un rol con permissions[].
   * Requiere permiso ROLE_VIEW.
   */
  public getById(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.baseUrl}/${id}`);
  }

  /**
   * POST /roles — crea un nuevo rol.
   * Requiere permiso ROLE_CREATE.
   */
  public create(body: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(this.baseUrl, body);
  }

  /**
   * PATCH /roles/:id — actualiza únicamente nombre y descripción de un rol.
   * Requiere permiso ROLE_EDIT.
   */
  public update(id: string, body: UpdateRoleRequest): Observable<Role> {
    return this.http.patch<Role>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * PATCH /roles/:id/status — activa o desactiva un rol (soft delete).
   * Requiere permiso ROLE_EDIT.
   */
  public setStatus(id: string, isActive: boolean): Observable<Role> {
    const payload: SetRoleStatusRequest = { isActive };
    return this.http.patch<Role>(`${this.baseUrl}/${id}/status`, payload);
  }

  /**
   * POST /roles/:id/clone — clona un rol existente con todos sus permisos asignados.
   * Requiere permiso ROLE_CREATE.
   */
  public clone(id: string, body: CloneRoleRequest): Observable<Role> {
    return this.http.post<Role>(`${this.baseUrl}/${id}/clone`, body);
  }

  /**
   * DELETE /roles/:id — eliminación física de un rol.
   * Requiere permiso ROLE_DELETE.
   */
  public remove(id: string): Observable<DeleteRoleResponse> {
    return this.http.delete<DeleteRoleResponse>(`${this.baseUrl}/${id}`);
  }

  private buildParams(query: RoleListQuery): HttpParams {
    let params = new HttpParams()
      .set('page', (query.page ?? 1).toString())
      .set('limit', (query.limit ?? 20).toString());

    if (query.search != null && query.search.trim().length > 0) {
      params = params.set('search', query.search.trim());
    }
    if (query.isActive !== undefined && query.isActive !== null) {
      params = params.set('isActive', String(query.isActive));
    }
    return params;
  }
}
