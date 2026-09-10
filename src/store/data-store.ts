import type {
  AppState,
  MenuItem,
  PaymentMethod,
  RecordSaleResult,
  Sale,
  SaleLine,
  StockItem,
  StoreStatus,
} from "../types";

type Listener = () => void;

const now = () => new Date().toISOString();

const DEMO_STOCK: StockItem[] = [
  {
    id: "stock-momo",
    name: "もも",
    initial_stock: 150,
    current_stock: 150,
    created_at: now(),
  },
  {
    id: "stock-kawa",
    name: "かわ",
    initial_stock: 80,
    current_stock: 80,
    created_at: now(),
  },
];

const DEMO_MENU: MenuItem[] = [
  {
    id: "menu-momo-tare",
    stock_item_id: "stock-momo",
    name: "もも（たれ）",
    price: 200,
    created_at: now(),
  },
  {
    id: "menu-momo-garlic",
    stock_item_id: "stock-momo",
    name: "もも（ガーリック塩）",
    price: 200,
    created_at: now(),
  },
  {
    id: "menu-kawa-tare",
    stock_item_id: "stock-kawa",
    name: "かわ（たれ）",
    price: 180,
    created_at: now(),
  },
];

class DataStore {
  private state: AppState = {
    stockItems: DEMO_STOCK,
    menuItems: DEMO_MENU,
    sales: [],
    status: { waiting_count: 0, sales_goal: 50000, updated_at: now() },
  };
  private listeners = new Set<Listener>();
  private locked = false;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.state;

  private emit() {
    for (const l of this.listeners) l();
  }
  private setState(partial: Partial<AppState> | ((p: AppState) => AppState)) {
    this.state =
      typeof partial === "function"
        ? partial(this.state)
        : { ...this.state, ...partial };
    this.emit();
  }

  replaceStockItems(items: StockItem[]) {
    this.setState((p) => ({ ...p, stockItems: items }));
  }
  replaceMenuItems(items: MenuItem[]) {
    this.setState((p) => ({ ...p, menuItems: items }));
  }
  replaceSales(sales: Sale[]) {
    this.setState((p) => ({ ...p, sales }));
  }
  replaceStatus(status: StoreStatus) {
    this.setState((p) => ({ ...p, status }));
  }

  /** デモ用（Supabase未設定時）の会計処理 */
  recordSaleLocal(
    lines: SaleLine[],
    payment_method: PaymentMethod,
  ): RecordSaleResult {
    if (this.locked)
      return { ok: false, message: "処理中です。少し待ってください" };
    this.locked = true;
    try {
      if (lines.length === 0)
        return { ok: false, message: "商品が選択されていません" };

      const deductions = new Map<string, number>();
      for (const line of lines) {
        const menu = this.state.menuItems.find(
          (m) => m.id === line.menu_item_id,
        );
        if (!menu) return { ok: false, message: "商品が見つかりません" };
        deductions.set(
          menu.stock_item_id,
          (deductions.get(menu.stock_item_id) ?? 0) + line.quantity,
        );
      }
      for (const [stockId, qty] of deductions) {
        const stock = this.state.stockItems.find((s) => s.id === stockId)!;
        if (stock.current_stock < qty) {
          return {
            ok: false,
            message: `${stock.name} の在庫が不足しています（残り${stock.current_stock}）`,
          };
        }
      }

      const total = lines.reduce((sum, line) => {
        const menu = this.state.menuItems.find(
          (m) => m.id === line.menu_item_id,
        )!;
        return sum + menu.price * line.quantity;
      }, 0);

      const sale: Sale = {
        id: crypto.randomUUID(),
        total_price: total,
        payment_method,
        created_at: now(),
        items: lines.map((l) => ({
          id: crypto.randomUUID(),
          menu_item_id: l.menu_item_id,
          quantity: l.quantity,
          unit_price: this.state.menuItems.find((m) => m.id === l.menu_item_id)!
            .price,
        })),
      };

      this.setState((p) => ({
        ...p,
        stockItems: p.stockItems.map((s) => {
          const d = deductions.get(s.id);
          return d ? { ...s, current_stock: s.current_stock - d } : s;
        }),
        sales: [...p.sales, sale],
      }));

      return {
        ok: true,
        sale: { id: sale.id, total_price: sale.total_price, payment_method },
      };
    } finally {
      this.locked = false;
    }
  }

  updateWaitingCountLocal(n: number) {
    this.setState((p) => ({
      ...p,
      status: { ...p.status, waiting_count: Math.max(0, n), updated_at: now() },
    }));
  }
  updateSalesGoalLocal(n: number) {
    this.setState((p) => ({
      ...p,
      status: { ...p.status, sales_goal: Math.max(0, n), updated_at: now() },
    }));
  }
}

export const dataStore = new DataStore();
