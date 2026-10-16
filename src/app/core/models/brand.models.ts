export interface CatalogBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrandListResponse {
  items: CatalogBrand[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BrandListQuery {
  search?: string | null;
  isActive?: boolean | null;
  page?: number;
  limit?: number;
}

export interface CreateBrandRequest {
  name: string;
  slug?: string;
  logoUrl?: string | null;
}

export interface UpdateBrandRequest {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
}

export interface SetBrandStatusRequest {
  isActive: boolean;
}
