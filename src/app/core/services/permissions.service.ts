import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PermissionMatrixResponse,
  UpdatePermissionMatrixRequest,
  UpdatePermissionMatrixResponse,
} from '../models/permission.models';

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/permissions`;

  /**
   * GET /permissions/matrix?roleId=... — obtiene la matriz de permisos para un rol.
   * Requiere permiso PERMISSION_VIEW.
   */
  public getMatrix(roleId: string): Observable<PermissionMatrixResponse> {
    return this.http.get<PermissionMatrixResponse>(`${this.baseUrl}/matrix`, {
      params: new HttpParams().set('roleId', roleId),
    });
  }

  /**
   * PUT /permissions/matrix/:roleId — actualiza atómicamente la matriz de permisos de un rol.
   * Requiere permiso PERMISSION_EDIT.
   */
  public updateMatrix(
    roleId: string,
    permissionIds: string[]
  ): Observable<UpdatePermissionMatrixResponse> {
    const payload: UpdatePermissionMatrixRequest = { permissionIds };
    return this.http.put<UpdatePermissionMatrixResponse>(
      `${this.baseUrl}/matrix/${roleId}`,
      payload
    );
  }
}
