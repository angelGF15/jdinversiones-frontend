/**
 * Rol asignado a un usuario interno.
 */
export interface UserRole {
  id: string;
  name: string;
}

/**
 * Entidad de Usuario interno en el sistema.
 */
export interface User {
  userId: string;
  entityId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  themePreference: 'light' | 'dark' | 'system' | null;
  lastLoginAt: string | null;
  createdAt: string;
  roles: UserRole[];
}

/**
 * Rol activo retornado por GET /users/roles (mapeado para uso en frontend en camelCase).
 */
export interface ActiveRole {
  roleId: string;
  name: string;
}

/**
 * Formato crudo retornado directamente por el backend NestJS en GET /users/roles.
 */
export interface ActiveRoleRawResponse {
  role_id: string;
  name: string;
}

/**
 * Respuesta paginada del listado de usuarios (GET /users).
 */
export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Parámetros de consulta para filtrar y paginar el listado de usuarios.
 */
export interface UserListQuery {
  search?: string | null;
  roleId?: string | null;
  isActive?: boolean | null;
  page?: number;
  limit?: number;
}

/**
 * Payload para crear un nuevo usuario (POST /users).
 */
export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  roleIds: string[];
}

/**
 * Payload para actualizar un usuario existente (PATCH /users/:id).
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  roleIds?: string[];
}

/**
 * Respuesta de creación exitosa (201) de usuario.
 * Contiene la contraseña temporal devuelta una sola vez y el flag de envío de correo.
 */
export interface CreateUserResponse extends User {
  temporaryPassword: string;
  emailSent: boolean;
}

/**
 * Respuesta de regeneración de contraseña temporal (POST /users/:id/temporary-password).
 */
export interface TemporaryPasswordResponse {
  userId: string;
  email: string;
  temporaryPassword: string;
  message: string;
}

/**
 * Payload para cambiar el estado activo/inactivo (PATCH /users/:id/status).
 */
export interface UpdateUserStatusRequest {
  isActive: boolean;
}
