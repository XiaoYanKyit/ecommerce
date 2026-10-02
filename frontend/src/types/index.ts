export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_staff: boolean;
  date_joined: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CategoryBrief {
  id: number;
  name: string;
  slug: string;
}

export interface Category extends CategoryBrief {
  description: string;
  image: string | null;
  product_count?: number;
}

/** Money values arrive from the API as strings, e.g. "45.00". */
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  discount_price: string | null;
  current_price: string;
  on_sale: boolean;
  discount_percent: number;
  category: CategoryBrief | null;
  image: string | null;
  stock: number;
  in_stock: boolean;
  sku: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  line_total: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
  item_count: number;
  subtotal: string;
  shipping_cost: string;
  total: string;
}

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export interface OrderItem {
  id: number;
  product_slug: string | null;
  product_name: string;
  product_sku: string;
  image: string | null;
  quantity: number;
  price: string;
  line_total: string;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  status_display: string;
  payment_status: PaymentStatus;
  payment_status_display: string;
  payment_method: string;
  payment_method_display: string;
  shipping_full_name: string;
  shipping_email: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  notes: string;
  subtotal: string;
  shipping_cost: string;
  total: string;
  customer_email: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface CheckoutPayload {
  shipping_full_name: string;
  shipping_email: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  notes: string;
  payment_method: "cod" | "card";
}

export interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  country: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  order_count: number;
  total_spent: string;
}

export interface AdminStats {
  total_orders: number;
  pending_orders: number;
  gross_sales: string;
  revenue: string;
  total_products: number;
  total_customers: number;
  orders_by_status: Record<OrderStatus, number>;
  sales_last_7_days: { date: string; orders: number; revenue: string }[];
  low_stock_products: { id: number; name: string; slug: string; sku: string; stock: number }[];
  recent_orders: { order_number: string; customer: string; total: string; status: OrderStatus; created_at: string }[];
}
