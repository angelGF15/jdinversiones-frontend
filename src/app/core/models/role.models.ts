/**
 * Permiso simplificado asociado a un rol en el detalle.
 */
export interface RolePermission {
  id: string;
  code: string;
}

/**
 * Entidad completa de Rol (retornada por GET /roles/:id, POST /roles, PATCH /roles/:id).
 */
export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: RolePermission[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Elemento de rol para el listado paginado (GET /roles).
 * No incluye array de permisos, solo el conteo permissionsCount.
 */
export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionsCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Respuesta paginada del listado de roles (GET /roles).
 */
export interface RoleListResponse {
  items: RoleListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Parámetros de consulta para filtrar y paginar el listado de roles.
 */
export interface RoleListQuery {
  search?: string | null;
  isActive?: boolean | null;
  page?: number;
  limit?: number;
}

/**
 * Payload para crear un nuevo rol (POST /roles).
 */
export interface CreateRoleRequest {
  name: string;
  description?: string | null;
  permissionIds?: string[];
}

/**
 * Payload para actualizar datos básicos de un rol (PATCH /roles/:id).
 */
export interface UpdateRoleRequest {
  name?: string;
  description?: string | null;
}

/**
 * Payload para clonar un rol existente (POST /roles/:id/clone).
 */
export interface CloneRoleRequest {
  name: string;
  description?: string | null;
}

/**
 * Payload para activar o desactivar un rol (PATCH /roles/:id/status).
 */
export interface SetRoleStatusRequest {
  isActive: boolean;
}

/**
 * Respuesta devuelta tras eliminar un rol (DELETE /roles/:id).
 */
export interface DeleteRoleResponse {
  message: string;
}
