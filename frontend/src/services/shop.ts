import type { Cart, CheckoutPayload, Order, Paginated } from "../types";
import { request } from "./api";

export const cartApi = {
  get: () => request<Cart>("/cart/"),
  add: (productId: number, quantity: number) =>
    request<Cart>("/cart/items/", { method: "POST", body: { product_id: productId, quantity } }),
  update: (itemId: number, quantity: number) =>
    request<Cart>(`/cart/items/${itemId}/`, { method: "PATCH", body: { quantity } }),
  remove: (itemId: number) => request<Cart>(`/cart/items/${itemId}/`, { method: "DELETE" }),
  clear: () => request<Cart>("/cart/", { method: "DELETE" }),
};

export const orderApi = {
  list: (page = 1) => request<Paginated<Order>>("/orders/", { params: { page } }),
  get: (orderNumber: string) => request<Order>(`/orders/${encodeURIComponent(orderNumber)}/`),
  checkout: (payload: CheckoutPayload) => request<Order>("/orders/", { method: "POST", body: payload }),
  cancel: (orderNumber: string) =>
    request<Order>(`/orders/${encodeURIComponent(orderNumber)}/cancel/`, { method: "POST" }),
};
