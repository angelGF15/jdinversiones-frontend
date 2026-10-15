export interface CategoryChild {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
  childrenCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category extends CategoryChild {
  children?: CategoryChild[];
}

export interface CategoryListResponse {
  items: CategoryChild[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoryListQuery {
  search?: string | null;
  parentId?: string | null;
  isActive?: boolean | null;
  page?: number;
  limit?: number;
}

export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  imageUrl?: string | null;
  displayOrder?: number;
}

export interface SetCategoryStatusRequest {
  isActive: boolean;
}
