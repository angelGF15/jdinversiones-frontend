/**
 * Modelos de datos para el módulo de Configuración del sistema.
 * Basados en el contrato expuesto por jdinversiones-backend (GET /config, GET /config/public, GET /config/currencies).
 */

export type IconName = string;

/** Definición del tipo de control y validaciones de una configuración. */
export interface SettingType {
  code: string;
  name: string;
  maxLength?: number | null;
  pattern?: string | null;
  optionsSource?: string | null;
}

/** Opción individual para configuraciones selectivas (ej. currencies, themes). */
export interface SettingOption {
  value: string;
  label: string;
}

/** Configuración clave-valor del sistema con metadatos descriptivos y de presentación. */
export interface Setting {
  key: string;
  value: string | null;
  description: string | null;
  updatedAt: string;
  label?: string | null;
  helper?: string | null;
  icon?: IconName | null;
  groupCode: string;
  sortOrder: number;
  isRequired: boolean;
  isPublic: boolean;
  type: SettingType;
  options?: SettingOption[] | null;
}

/** Grupo temático de configuraciones expuesto por el backend. */
export interface ConfigGroup {
  code: string;
  label: string;
  description: string;
  icon: IconName;
}

/** Respuesta del listado completo de configuraciones y grupos (GET /config). */
export interface SettingListResponse {
  settings: Setting[];
  groups?: ConfigGroup[];
}

/** Item de actualización de una setting (PATCH /config). */
export interface UpdateSettingItem {
  key: string;
  value: string | null;
}

/** Payload de actualización masiva y atómica (PATCH /config). */
export interface UpdateSettingsRequest {
  settings: UpdateSettingItem[];
}

/** Identidad de marca de la empresa (GET /config/public). */
export interface Brand {
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
}

/** Información oficial de contacto de la empresa (GET /config/public). */
export interface Contact {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
}

/** Enlaces a redes sociales oficiales (GET /config/public). */
export interface Social {
  facebookUrl: string | null;
  instagramUrl: string | null;
}

/** Datos públicos de marca y contacto consumidos sin autenticación (GET /config/public). */
export interface PublicBranding {
  brand: Brand;
  contact: Contact;
  social: Social;
}

/** Moneda activa del catálogo de divisas (GET /config/currencies). */
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  decimalPlaces: number;
  isDefault: boolean;
}

// ==============================================================================
// CONTACTOS Y CANALES DE NOTIFICACIÓN
// ==============================================================================

/** Canal de notificación del catálogo (GET /config/channels). */
export interface NotificationChannel {
  id: string;
  code: string;
  name: string;
}

/** Respuesta del catálogo de canales. */
export interface NotificationChannelListResponse {
  channels: NotificationChannel[];
}

/** Tipo de destinatario del catálogo (GET /config/recipient-types). */
export interface NotificationRecipientType {
  id: string;
  code: string;
  name: string;
}

/** Respuesta del catálogo de tipos de destinatario. */
export interface NotificationRecipientTypeListResponse {
  recipientTypes: NotificationRecipientType[];
}

/** Contacto de notificación (CRUD en /config/notification-recipients). */
export interface NotificationRecipient {
  id: string;
  channelId: string;
  channelCode: string;
  channelName: string;
  recipientTypeId: string;
  recipientTypeCode: string;
  recipientTypeName: string;
  contact: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Respuesta del listado de contactos (sin paginación). */
export interface NotificationRecipientListResponse {
  recipients: NotificationRecipient[];
}

/** Filtros del listado de contactos. */
export interface NotificationRecipientListQuery {
  isActive?: boolean | null;
}

/** Payload de alta de contacto (POST /config/notification-recipients). */
export interface CreateNotificationRecipientRequest {
  channelId: string;
  recipientTypeId: string;
  contact: string;
  label?: string | null;
}

/** Payload de edición de contacto (PATCH /config/notification-recipients/:id). */
export interface UpdateNotificationRecipientRequest {
  contact?: string;
  label?: string | null;
}

/** Payload de cambio de estado de contacto (PATCH /:id/status). */
export interface SetRecipientStatusRequest {
  isActive: boolean;
}
