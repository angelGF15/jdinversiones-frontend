/**
 * Permiso individual retornado en respuestas de actualización.
 */
export interface PermissionItem {
  id: string;
  code: string;
}

/**
 * Acción de permiso dentro de un módulo en la matriz de permisos.
 */
export interface PermissionMatrixAction {
  actionId: string;
  actionCode: string; // minúsculas en runtime: 'view' | 'create' | 'edit' | 'delete' | 'export'
  permissionId: string;
  permissionCode: string; // SIEMPRE 'MODULO_ACCION' en mayúsculas — usar esto en la UI
  isAssigned: boolean;
}

/**
 * Módulo del sistema agrupador de permisos en la matriz.
 */
export interface PermissionMatrixModule {
  moduleId: string;
  moduleName: string;
  moduleCode: string;
  moduleOrder: number;
  actions: PermissionMatrixAction[];
}

/**
 * Respuesta de la matriz de permisos para un rol (GET /permissions/matrix?roleId=...).
 */
export interface PermissionMatrixResponse {
  roleId: string;
  roleName: string;
  modules: PermissionMatrixModule[];
}

/**
 * Payload para actualizar atómicamente la matriz de permisos de un rol (PUT /permissions/matrix/:roleId).
 */
export interface UpdatePermissionMatrixRequest {
  permissionIds: string[];
}

/**
 * Respuesta devuelta tras actualizar la matriz de permisos.
 */
export interface UpdatePermissionMatrixResponse {
  message: string;
  permissions: PermissionItem[];
}
