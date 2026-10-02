import type { AdminStats, Category, Customer, Order, OrderStatus, Paginated, PaymentStatus, Product } from "../types";
import { request } from "./api";

export const adminApi = {
  stats: () => request<AdminStats>("/admin/stats/"),

  orders: (params: { status?: string; payment_status?: string; search?: string; page?: number }) =>
    request<Paginated<Order>>("/admin/orders/", { params }),
  updateOrder: (orderNumber: string, patch: { status?: OrderStatus; payment_status?: PaymentStatus }) =>
    request<Order>(`/admin/orders/${encodeURIComponent(orderNumber)}/`, { method: "PATCH", body: patch }),

  customers: (params: { search?: string; page?: number }) =>
    request<Paginated<Customer>>("/admin/customers/", { params }),
  updateCustomer: (id: number, patch: { is_active: boolean }) =>
    request<Customer>(`/admin/customers/${id}/`, { method: "PATCH", body: patch }),

 
  createProduct: (data: FormData) => request<Product>("/products/", { method: "POST", body: data }),
  updateProduct: (slug: string, data: FormData) =>
    request<Product>(`/products/${encodeURIComponent(slug)}/`, { method: "PATCH", body: data }),
  deleteProduct: (slug: string) => request<void>(`/products/${encodeURIComponent(slug)}/`, { method: "DELETE" }),

  createCategory: (data: FormData) => request<Category>("/categories/", { method: "POST", body: data }),
  updateCategory: (slug: string, data: FormData) =>
    request<Category>(`/categories/${encodeURIComponent(slug)}/`, { method: "PATCH", body: data }),
  deleteCategory: (slug: string) => request<void>(`/categories/${encodeURIComponent(slug)}/`, { method: "DELETE" }),
};
