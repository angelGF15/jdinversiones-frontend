import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateNotificationRecipientRequest,
  NotificationChannelListResponse,
  NotificationRecipient,
  NotificationRecipientListQuery,
  NotificationRecipientListResponse,
  NotificationRecipientTypeListResponse,
  SetRecipientStatusRequest,
  Setting,
  SettingListResponse,
  UpdateNotificationRecipientRequest,
  UpdateSettingsRequest,
} from '../models/config.models';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly baseUrl = `${this.apiUrl}/config`;

  // ==========================================================================
  // CONFIGURACIONES GENERALES
  // ==========================================================================

  /**
   * GET /config — devuelve las 10 keys de tbl_settings, incluso con value null.
   * Requiere permiso CONFIG_VIEW.
   */
  public getSettings(): Observable<SettingListResponse> {
    return this.http.get<SettingListResponse>(this.baseUrl);
  }

  /**
   * GET /config/:key — devuelve una configuración puntual por su clave.
   * No usar con las rutas de catálogo ('channels', 'recipient-types').
   * Requiere permiso CONFIG_VIEW.
   */
  public getSettingByKey(key: string): Observable<Setting> {
    return this.http.get<Setting>(`${this.baseUrl}/${key}`);
  }

  /**
   * PATCH /config — actualiza varias claves en una ÚNICA transacción atómica.
   * Enviar siempre todas las claves modificadas juntas: si una falla, ninguna se aplica.
   * Requiere permiso CONFIG_EDIT.
   */
  public updateSettings(items: UpdateSettingsRequest['settings']): Observable<SettingListResponse> {
    const payload: UpdateSettingsRequest = { settings: items };
    return this.http.patch<SettingListResponse>(this.baseUrl, payload);
  }

  // ==========================================================================
  // CONTACTOS DE NOTIFICACIÓN
  // ==========================================================================

  /**
   * GET /config/notification-recipients — lista los contactos de notificación.
   * Sin paginación. Requiere permiso CONFIG_VIEW.
   */
  public listRecipients(
    query: NotificationRecipientListQuery = {}
  ): Observable<NotificationRecipientListResponse> {
    let params = new HttpParams();
    if (query.isActive !== undefined && query.isActive !== null) {
      params = params.set('isActive', String(query.isActive));
    }
    return this.http.get<NotificationRecipientListResponse>(
      `${this.baseUrl}/notification-recipients`,
      { params }
    );
  }

  /**
   * GET /config/notification-recipients/:id — detalle de un contacto.
   * Requiere permiso CONFIG_VIEW.
   */
  public getRecipientById(id: string): Observable<NotificationRecipient> {
    return this.http.get<NotificationRecipient>(`${this.baseUrl}/notification-recipients/${id}`);
  }

  /**
   * POST /config/notification-recipients — crea un contacto.
   * Devuelve 409 si el (channel, contact) ya existe.
   * Requiere permiso CONFIG_EDIT.
   */
  public createRecipient(
    body: CreateNotificationRecipientRequest
  ): Observable<NotificationRecipient> {
    return this.http.post<NotificationRecipient>(`${this.baseUrl}/notification-recipients`, body);
  }

  /**
   * PATCH /config/notification-recipients/:id — actualiza contact y/o label.
   * label: null borra la etiqueta. contact no acepta null ni cadena vacía.
   * Requiere permiso CONFIG_EDIT.
   */
  public updateRecipient(
    id: string,
    body: UpdateNotificationRecipientRequest
  ): Observable<NotificationRecipient> {
    return this.http.patch<NotificationRecipient>(
      `${this.baseUrl}/notification-recipients/${id}`,
      body
    );
  }

  /**
   * PATCH /config/notification-recipients/:id/status — activa o desactiva el contacto.
   * Devuelve 409 si se intenta desactivar el último contacto activo.
   * Requiere permiso CONFIG_EDIT.
   */
  public setRecipientStatus(id: string, isActive: boolean): Observable<NotificationRecipient> {
    const payload: SetRecipientStatusRequest = { isActive };
    return this.http.patch<NotificationRecipient>(
      `${this.baseUrl}/notification-recipients/${id}/status`,
      payload
    );
  }

  // ==========================================================================
  // CATÁLOGOS DE SOPORTE
  // ==========================================================================

  /**
   * GET /config/channels — catálogo de canales activos (email, whatsapp).
   * Requiere permiso CONFIG_VIEW.
   */
  public listChannels(): Observable<NotificationChannelListResponse> {
    return this.http.get<NotificationChannelListResponse>(`${this.baseUrl}/channels`);
  }

  /**
   * GET /config/recipient-types — catálogo de tipos de destinatario activos.
   * Requiere permiso CONFIG_VIEW.
   */
  public listRecipientTypes(): Observable<NotificationRecipientTypeListResponse> {
    return this.http.get<NotificationRecipientTypeListResponse>(`${this.baseUrl}/recipient-types`);
  }
}
