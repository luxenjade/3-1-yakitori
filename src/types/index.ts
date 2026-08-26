export type PaymentMethod = "cash" | "ic";
export type OrderSource = "mobile" | "pos";
export type OrderStatus = "pending" | "cooking" | "ready" | "completed";
export type ItemStatus = "active" | "sold_out";

export interface Item {
  id: string;
  name: string;
  price: number;
  initial_stock: number;
  current_stock: number;
  status: ItemStatus;
  image_emoji: string;
  created_at: string;
}

export interface TemporaryOrderItem {
  id: string;
  temporary_order_id: string;
  item_id: string;
  quantity: number;
}

export interface TemporaryOrder {
  id: string;
  short_code: string;
  total_price: number;
  expires_at: string;
  created_at: string;
  items: TemporaryOrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
}

export interface Order {
  id: string;
  ticket_number: number;
  total_price: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  order_source: OrderSource;
  created_at: string;
  items: OrderItem[];
  pickup_token?: string | null;
  pickup_expires_at?: string | null;
  pickup_used_at?: string | null;
}

export interface CartLine {
  item_id: string;
  quantity: number;
}

export interface CheckoutInput {
  temporary_order_id?: string;
  short_code?: string;
  lines?: CartLine[];
  payment_method: PaymentMethod;
  order_source: OrderSource;
}

export interface CheckoutResult {
  ok: true;
  order: Order;
}

export interface CheckoutError {
  ok: false;
  message: string;
}

export type CheckoutResponse = CheckoutResult | CheckoutError;

export interface AppState {
  items: Item[];
  temporaryOrders: TemporaryOrder[];
  orders: Order[];
  salesGoal: number;
}
