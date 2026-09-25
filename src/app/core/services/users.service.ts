import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActiveRole,
  ActiveRoleRawResponse,
  CreateUserRequest,
  CreateUserResponse,
  TemporaryPasswordResponse,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  User,
  UserListQuery,
  UserListResponse,
} from '../models/user.models';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/users`;

  /**
   * Obtiene el listado paginado y filtrado de usuarios internos.
   * Requiere permiso USER_VIEW.
   */
  public list(query: UserListQuery): Observable<UserListResponse> {
    return this.http.get<UserListResponse>(this.baseUrl, {
      params: this.buildParams(query),
    });
  }

  /**
   * Obtiene la lista de roles activos para dropdowns y asignaciones en formularios.
   * Mapea el campo snake_case `role_id` devuelto por el backend a `roleId`.
   * Requiere permiso USER_VIEW.
   */
  public listActiveRoles(): Observable<ActiveRole[]> {
    return this.http.get<ActiveRoleRawResponse[]>(`${this.baseUrl}/roles`).pipe(
      map((roles) =>
        roles.map((r) => ({
          roleId: r.role_id,
          name: r.name,
        }))
      )
    );
  }

  /**
   * Obtiene el detalle de un usuario específico por su identificador UUID.
   * Requiere permiso USER_VIEW.
   */
  public getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  /**
   * Registra un nuevo usuario interno en el sistema.
   * Retorna el usuario creado junto con la contraseña temporal de un solo uso (`temporaryPassword`)
   * y el indicador de envío de correo (`emailSent`).
   * Requiere permiso USER_CREATE.
   */
  public create(body: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(this.baseUrl, body);
  }

  /**
   * Actualiza datos personales y/o roles de un usuario existente.
   * Nota: Si se envía `roleIds`, reemplaza atómicamente todos los roles asignados.
   * Requiere permiso USER_EDIT.
   */
  public update(id: string, body: UpdateUserRequest): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, body);
  }

  /**
   * Activa o desactiva (soft delete) un usuario en el sistema.
   * Requiere permiso USER_EDIT.
   */
  public setStatus(id: string, isActive: boolean): Observable<User> {
    const payload: UpdateUserStatusRequest = { isActive };
    return this.http.patch<User>(`${this.baseUrl}/${id}/status`, payload);
  }

  /**
   * Genera y devuelve una nueva contraseña temporal para el usuario.
   * Se entrega una sola vez en la respuesta y no es recuperable posteriormente.
   * Requiere permiso USER_EDIT.
   */
  public generateTemporaryPassword(id: string): Observable<TemporaryPasswordResponse> {
    return this.http.post<TemporaryPasswordResponse>(
      `${this.baseUrl}/${id}/temporary-password`,
      {}
    );
  }

  /**
   * Sube o actualiza la foto de avatar de un usuario específico.
   * Requiere permiso USER_EDIT.
   */
  public uploadAvatar(userId: string, file: File): Observable<User> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<User>(`${this.baseUrl}/${userId}/avatar`, formData);
  }

  /**
   * Construye los HttpParams de consulta omitiendo valores nulos o indefinidos,
   * y garantizando que `page` y `limit` tengan valores por defecto válidos.
   */
  private buildParams(query: UserListQuery): HttpParams {
    let params = new HttpParams()
      .set('page', (query.page ?? 1).toString())
      .set('limit', (query.limit ?? 20).toString());

    if (query.search !== undefined && query.search !== null && query.search.trim().length > 0) {
      params = params.set('search', query.search.trim());
    }

    if (query.roleId !== undefined && query.roleId !== null && query.roleId.trim().length > 0) {
      params = params.set('roleId', query.roleId.trim());
    }

    if (query.isActive !== undefined && query.isActive !== null) {
      params = params.set('isActive', String(query.isActive));
    }

    return params;
  }
}
