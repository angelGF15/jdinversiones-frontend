/** Grupo funcional al que pertenece una setting, usado para renderizar las secciones del formulario. */
export type ConfigSettingGroup = 'empresa' | 'redes' | 'operacion' | 'aplicacion';

/**
 * Widget a renderizar para una key de configuración.
 * - 'text'     → input de texto
 * - 'email'    → input type="email"
 * - 'tel'      → input type="tel"
 * - 'url'      → input type="url" (opcional, se puede dejar vacío)
 * - 'number'   → input type="number" con enteros >= 0
 * - 'theme'    → select light | dark
 * - 'currency' → select con códigos de moneda frecuentes
 */
export type ConfigSettingWidget =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'theme'
  | 'currency';

/** Opción de un <select> nativo controlado por ConfigSettingMeta. */
export interface ConfigSettingOption {
  value: string;
  label: string;
}

/** Metadatos de presentación y validación de una key de configuración. */
export interface ConfigSettingMeta {
  label: string;
  helper: string;
  group: ConfigSettingGroup;
  widget: ConfigSettingWidget;
  icon: string;
  required: boolean;
  /** Opciones cuando widget === 'theme' | 'currency'. */
  options?: ConfigSettingOption[];
  /** Valor mostrado cuando el backend devuelve value === null. */
  fallbackValue?: string;
}

/** Configuración clave-valor del sistema (GET /config, GET /config/:key). */
export interface Setting {
  key: string;
  value: string | null;
  description: string | null;
  updatedAt: string;
}

/** Respuesta del listado completo de settings (GET /config). */
export interface SettingListResponse {
  settings: Setting[];
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

/**
 * Registro de presentación y validación de las keys de tbl_settings.
 * Si el backend devuelve una key que NO está aquí, la UI la renderiza
 * con un input de texto genérico usando su `description`.
 */
export const SETTINGS_REGISTRY: Record<string, ConfigSettingMeta> = {
  company_name: {
    label: 'Nombre comercial',
    helper: 'Se muestra en las cabeceras y correos del sistema.',
    group: 'empresa',
    widget: 'text',
    icon: 'storefront',
    required: true,
  },
  company_email: {
    label: 'Correo de contacto',
    helper: 'Correo principal de la empresa.',
    group: 'empresa',
    widget: 'email',
    icon: 'mail',
    required: true,
  },
  company_phone: {
    label: 'Teléfono',
    helper: 'Teléfono principal de la empresa.',
    group: 'empresa',
    widget: 'tel',
    icon: 'contact_phone',
    required: false,
  },
  whatsapp_number: {
    label: 'WhatsApp',
    helper: 'Número usado en el botón de contacto del sitio público.',
    group: 'redes',
    widget: 'tel',
    icon: 'chat',
    required: false,
  },
  facebook_url: {
    label: 'Facebook',
    helper: 'Enlace completo a la página de Facebook.',
    group: 'redes',
    widget: 'url',
    icon: 'link',
    required: false,
  },
  instagram_url: {
    label: 'Instagram',
    helper: 'Enlace completo al perfil. Puede quedar vacío.',
    group: 'redes',
    widget: 'url',
    icon: 'link',
    required: false,
  },
  default_theme: {
    label: 'Tema por defecto',
    helper: 'Tema inicial del panel. Solo aplica a sesiones nuevas.',
    group: 'aplicacion',
    widget: 'theme',
    icon: 'palette',
    required: true,
    options: [
      { value: 'light', label: 'Claro' },
      { value: 'dark', label: 'Oscuro' },
    ],
  },
  currency: {
    label: 'Moneda',
    helper: 'Código ISO de 3 letras usado en todos los precios.',
    group: 'aplicacion',
    widget: 'currency',
    icon: 'payments',
    required: true,
    options: [
      { value: 'HNL', label: 'HNL — Lempira hondureño' },
      { value: 'USD', label: 'USD — Dólar estadounidense' },
      { value: 'EUR', label: 'EUR — Euro' },
      { value: 'MXN', label: 'MXN — Peso mexicano' },
      { value: 'GTQ', label: 'GTQ — Quetzal guatemalteco' },
      { value: 'COP', label: 'COP — Peso colombiano' },
      { value: 'CRC', label: 'CRC — Colón costarricense' },
      { value: 'PAB', label: 'PAB — Balboa panameño' },
    ],
  },
  no_movement_threshold_days: {
    label: 'Días sin movimiento',
    helper: 'Días sin venta para marcar un producto como sin movimiento.',
    group: 'operacion',
    widget: 'number',
    icon: 'trending_flat',
    required: true,
  },
  low_stock_threshold_days: {
    label: 'Umbral de stock bajo',
    helper: 'Unidades en existencia que disparan la alerta de stock bajo.',
    group: 'operacion',
    widget: 'number',
    icon: 'inventory_2',
    required: true,
  },
};

/** Orden de las secciones del formulario de configuración general. */
export const SETTINGS_GROUPS: {
  key: ConfigSettingGroup;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    key: 'empresa',
    label: 'Datos de la empresa',
    description: 'Información visible en el panel y en los correos.',
    icon: 'storefront',
  },
  {
    key: 'redes',
    label: 'Redes sociales',
    description: 'Contactos y enlaces usados en el sitio público.',
    icon: 'public',
  },
  {
    key: 'operacion',
    label: 'Umbrales operativos',
    description: 'Reglas consumidas por el Dashboard y los Reportes.',
    icon: 'query_stats',
  },
  {
    key: 'aplicacion',
    label: 'Preferencias de la aplicación',
    description: 'Moneda y tema por defecto del panel.',
    icon: 'tune',
  },
];
