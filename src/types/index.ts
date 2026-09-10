export type PaymentMethod = "cash" | "ic";

export interface StockItem {
  id: string;
  name: string;
  initial_stock: number;
  current_stock: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  stock_item_id: string;
  name: string;
  price: number;
  created_at: string;
}

export interface SaleLine {
  menu_item_id: string;
  quantity: number;
}

export interface SaleItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
}

export interface Sale {
  id: string;
  total_price: number;
  payment_method: PaymentMethod;
  created_at: string;
  items: SaleItem[];
}

export interface StoreStatus {
  waiting_count: number;
  sales_goal: number;
  updated_at: string;
}

export interface AppState {
  stockItems: StockItem[];
  menuItems: MenuItem[];
  sales: Sale[];
  status: StoreStatus;
}

export interface RecordSaleResult {
  ok: boolean;
  message?: string;
  sale?: { id: string; total_price: number; payment_method: PaymentMethod };
}
