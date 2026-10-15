export interface CatalogAttribute {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Alias de CatalogAttribute para flexibilidad y compatibilidad de tipos
 */
export type Attribute = CatalogAttribute;

export interface AttributeListResponse {
  items: CatalogAttribute[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttributeListQuery {
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateAttributeRequest {
  name: string;
  description?: string | null;
  displayOrder?: number;
}

export interface UpdateAttributeRequest {
  name?: string;
  description?: string | null;
  displayOrder?: number;
}

export interface SetAttributeStatusRequest {
  isActive: boolean;
}
