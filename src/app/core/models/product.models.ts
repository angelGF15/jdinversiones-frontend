export interface ProductStatus {
  id: string;
  code: string;
  name: string;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductAttributeItem {
  id: string;
  attributeId: string;
  attributeName: string;
  value: string;
  displayOrder: number;
}

export interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  slug: string;
  price: number;
  costPrice: number | null;
  isFeatured: boolean;
  statusId: string;
  statusCode: string;
  categoryId: string;
  categoryName: string;
  brandId: string | null;
  brandName: string | null;
  primaryImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends ProductListItem {
  shortDescription: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  images: ProductImage[];
  attributes: ProductAttributeItem[];
}

/**
 * Alias de conveniencia para la entidad de producto completa
 */
export type Product = ProductDetail;

export interface ProductListResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductListQuery {
  search?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  isFeatured?: boolean | null;
  isActive?: boolean | null;
  statusId?: string | null;
  statusCode?: string | null;
  page?: number;
  limit?: number;
}

export interface ExportProductQuery extends ProductListQuery {
  format?: 'xlsx' | 'csv';
}

export interface ProductImageInput {
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductAttributeInput {
  attributeId: string;
  value: string;
  displayOrder: number;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  price: number;
  costPrice?: number | null;
  categoryId: string;
  brandId: string;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  images?: ProductImageInput[];
  attributes?: ProductAttributeInput[];
  statusCode?: string;
}

export interface UpdateProductRequest {
  sku?: string;
  name?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  price?: number;
  costPrice?: number | null;
  categoryId?: string;
  brandId?: string;
  isFeatured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  images?: ProductImageInput[];
  attributes?: ProductAttributeInput[];
}

export interface SetProductStatusRequest {
  statusCode: string;
}
