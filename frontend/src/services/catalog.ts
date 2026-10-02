import type { Category, Paginated, Product } from "../types";
import { request } from "./api";

export interface ProductQuery {
  search?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
  in_stock?: boolean;
  on_sale?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
  include_inactive?: boolean;
}

export const catalogApi = {
  products: (query: ProductQuery = {}) => request<Paginated<Product>>("/products/", { params: { ...query } }),
  product: (slug: string) => request<Product>(`/products/${encodeURIComponent(slug)}/`),
  categories: () => request<Category[]>("/categories/"),
};
