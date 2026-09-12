import type {
  AppState,
  BoilBatch,
  BoilBatchResult,
  MenuItem,
  Sale,
  StockItem,
  StoreStatus,
} from "../types";

type Listener = () => void;

const now = () => new Date().toISOString();

const DEMO_STOCK: StockItem[] = [
  { id: "stock-momo", name: "もも", initial_stock: 150, current_stock: 150, created_at: now() },
  { id: "stock-kawa", name: "かわ", initial_stock: 80, current_stock: 80, created_at: now() },
];

const DEMO_MENU: MenuItem[] = [
  { id: "menu-momo-tare", stock_item_id: "stock-momo", name: "もも（たれ）", price: 200, created_at: now() },
  { id: "menu-momo-garlic", stock_item_id: "stock-momo", name: "もも（ガーリック塩）", price: 200, created_at: now() },
  { id: "menu-kawa-tare", stock_item_id: "stock-kawa", name: "かわ（たれ）", price: 180, created_at: now() },
];

class DataStore {
  private state: AppState = {
    stockItems: DEMO_STOCK,
    menuItems: DEMO_MENU,
    sales: [],
    status: { waiting_count: 0, sales_goal: 50000, updated_at: now() },
    boilBatches: [],
  };
  private listeners = new Set<Listener>();

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.state;

  private emit() {
    for (const l of this.listeners) l();
  }
  private setState(partial: Partial<AppState> | ((p: AppState) => AppState)) {
    this.state = typeof partial === "function" ? partial(this.state) : { ...this.state, ...partial };
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
  replaceBoilBatches(batches: BoilBatch[]) {
    this.setState((p) => ({ ...p, boilBatches: batches }));
  }

  updateWaitingCountLocal(n: number) {
    this.setState((p) => ({ ...p, status: { ...p.status, waiting_count: Math.max(0, n), updated_at: now() } }));
  }
  updateSalesGoalLocal(n: number) {
    this.setState((p) => ({ ...p, status: { ...p.status, sales_goal: Math.max(0, n), updated_at: now() } }));
  }

  /** デモ用（Supabase未設定時）の湯煎リクエスト */
  requestBoilBatchLocal(momoQty: number, kawaQty: number): BoilBatchResult {
    if (momoQty < 0 || kawaQty < 0 || momoQty % 10 !== 0 || kawaQty % 10 !== 0) {
      return { ok: false, message: "本数は10本単位で指定してください" };
    }
    const total = momoQty + kawaQty;
    if (total <= 0 || total > 60) {
      return { ok: false, message: "合計は1〜60本の範囲で指定してください" };
    }
    if (this.state.boilBatches.some((b) => b.status === "requested")) {
      return { ok: false, message: "前回のリクエストがまだ受理されていません" };
    }

    const batch: BoilBatch = {
      id: crypto.randomUUID(),
      momo_qty: momoQty,
      kawa_qty: kawaQty,
      status: "requested",
      requested_at: now(),
      accepted_at: null,
      delivered_at: null,
    };
    this.setState((p) => ({ ...p, boilBatches: [batch, ...p.boilBatches] }));
    return { ok: true, id: batch.id };
  }

  cancelBoilBatchLocal(id: string): BoilBatchResult {
    const batch = this.state.boilBatches.find((b) => b.id === id);
    if (!batch) return { ok: false, message: "リクエストが見つかりません" };
    if (batch.status !== "requested") return { ok: false, message: "すでに受理済みのため取り消せません" };
    this.setState((p) => ({
      ...p,
      boilBatches: p.boilBatches.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
    }));
    return { ok: true };
  }

  acceptBoilBatchLocal(id: string): BoilBatchResult {
    const batch = this.state.boilBatches.find((b) => b.id === id);
    if (!batch) return { ok: false, message: "リクエストが見つかりません" };
    if (batch.status !== "requested") return { ok: false, message: "このリクエストは受理できません" };
    this.setState((p) => ({
      ...p,
      boilBatches: p.boilBatches.map((b) =>
        b.id === id ? { ...b, status: "accepted", accepted_at: now() } : b,
      ),
    }));
    return { ok: true };
  }

  deliverBoilBatchLocal(id: string): BoilBatchResult {
    const batch = this.state.boilBatches.find((b) => b.id === id);
    if (!batch) return { ok: false, message: "リクエストが見つかりません" };
    if (batch.status !== "accepted") return { ok: false, message: "このリクエストは配達完了にできません" };
    this.setState((p) => ({
      ...p,
      boilBatches: p.boilBatches.map((b) =>
        b.id === id ? { ...b, status: "delivered", delivered_at: now() } : b,
      ),
    }));
    return { ok: true };
  }
}

export const dataStore = new DataStore();