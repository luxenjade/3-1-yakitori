import type {
  AppState,
  CheckoutInput,
  Item,
  Order,
  OrderStatus,
  TemporaryOrder,
} from "../types";
import type { Store, PickupPollResult } from "./types";
import { supabase } from "../lib/supabase";
import { checkout as checkoutViaEdgeFunction } from "../lib/api";

const itemEmoji: Record<string, string> = {
  "もも（タレ）": "🍗",
  "ねぎま（タレ）": "🧅",
  "つくね（タレ）": "🍡",
  "かわ（塩）": "🔥",
  "ささみ（塩）": "🥩",
  お茶: "🍵",
};

type DbItem = Omit<Item, "image_emoji">;
function toItem(item: DbItem): Item {
  return { ...item, image_emoji: itemEmoji[item.name] ?? "🍢" };
}

type Listener = () => void;

class SupabaseStore implements Store {
  private state: AppState = {
    items: [],
    temporaryOrders: [],
    orders: [],
    salesGoal: 50000,
  };
  private listeners = new Set<Listener>();
  private started = false;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  private emit() {
    for (const l of this.listeners) l();
  }

  private setState(partial: Partial<AppState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  /** StoreProviderから一度だけ呼ばれる。itemsとordersを取得し、Realtimeを購読する。 */
  start() {
    if (this.started || !supabase) return;
    this.started = true;

    const loadItems = async () => {
      const { data, error } = await supabase!
        .from("items")
        .select("*")
        .order("created_at");
      if (error) {
        console.error("Supabaseの商品取得に失敗しました", error.message);
        return;
      }
      if (data) this.setState({ items: data.map(toItem) });
    };

    const loadOrders = async () => {
      // staff専用テーブル(RLS)。匿名客はエラーになるが無視してよい（想定内）。
      const { data, error } = await supabase!
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: true });
      if (error) return;
      if (data) {
        const orders: Order[] = data.map((row) => ({
          id: row.id,
          ticket_number: row.ticket_number,
          total_price: row.total_price,
          payment_method: row.payment_method,
          status: row.status,
          order_source: row.order_source,
          created_at: row.created_at,
          pickup_token: row.pickup_token,
          pickup_expires_at: row.pickup_expires_at,
          pickup_used_at: row.pickup_used_at,
          items: (row.order_items ?? []).map(
            (oi: {
              id: string;
              order_id: string;
              item_id: string;
              quantity: number;
            }) => ({
              id: oi.id,
              order_id: oi.order_id,
              item_id: oi.item_id,
              quantity: oi.quantity,
            }),
          ),
        }));
        this.setState({ orders });
      }
    };

    void loadItems();
    void loadOrders();

    supabase
      .channel("public:items:store")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => void loadItems(),
      )
      .subscribe();

    supabase
      .channel("public:orders:store")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => void loadOrders(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => void loadOrders(),
      )
      .subscribe();
  }

  getItem(id: string) {
    return this.state.items.find((i) => i.id === id);
  }

  getWaitingCount() {
    return this.state.orders.filter(
      (o) =>
        o.status === "pending" ||
        o.status === "cooking" ||
        o.status === "ready",
    ).length;
  }

  getEstimatedWaitMinutes() {
    return Math.max(1, Math.ceil(this.getWaitingCount() * 1.5));
  }

  getSalesTotal() {
    return this.state.orders.reduce((sum, o) => sum + o.total_price, 0);
  }

  getCurrentCallingTicket() {
    const ready = this.state.orders
      .filter((o) => o.status === "ready")
      .sort((a, b) => a.ticket_number - b.ticket_number);
    return ready[0]?.ticket_number ?? null;
  }

  async createTemporaryOrder(
    lines: { item_id: string; quantity: number }[],
  ): Promise<TemporaryOrder> {
    if (!supabase) throw new Error("Supabaseが設定されていません");
    if (lines.length === 0) throw new Error("カートが空です");
    const { data, error } = await supabase.rpc("create_temporary_order", {
      p_lines: lines.map((l) => ({ item_id: l.item_id, quantity: l.quantity })),
    });
    if (error) throw new Error(error.message);
    const result = data as {
      ok: boolean;
      message?: string;
      temporary_order?: {
        id: string;
        short_code: string;
        total_price: number;
        expires_at: string;
        items: { item_id: string; quantity: number }[];
      };
    };
    if (!result.ok || !result.temporary_order)
      throw new Error(result.message ?? "仮注文に失敗しました");
    const t = result.temporary_order;
    return {
      id: t.id,
      short_code: t.short_code,
      total_price: t.total_price,
      expires_at: t.expires_at,
      created_at: new Date().toISOString(),
      items: (t.items ?? []).map((i) => ({
        id: `${t.id}-${i.item_id}`,
        temporary_order_id: t.id,
        item_id: i.item_id,
        quantity: i.quantity,
      })),
    };
  }

  async findTemporaryOrder(opts: {
    id?: string;
    short_code?: string;
  }): Promise<TemporaryOrder | undefined> {
    if (!supabase) return undefined;
    const { data, error } = await supabase.rpc("find_temporary_order", {
      p_short_code: opts.short_code ?? null,
      p_id: opts.id ?? null,
    });
    if (error) return undefined;
    const result = data as {
      ok: boolean;
      temporary_order?: {
        id: string;
        short_code: string;
        total_price: number;
        expires_at: string;
        items: { item_id: string; quantity: number }[];
      };
    };
    if (!result.ok || !result.temporary_order) return undefined;
    const t = result.temporary_order;
    return {
      id: t.id,
      short_code: t.short_code,
      total_price: t.total_price,
      expires_at: t.expires_at,
      created_at: new Date().toISOString(),
      items: (t.items ?? []).map((i) => ({
        id: `${t.id}-${i.item_id}`,
        temporary_order_id: t.id,
        item_id: i.item_id,
        quantity: i.quantity,
      })),
    };
  }

  async pollTemporaryOrderResult(
    temporaryOrderId: string,
  ): Promise<PickupPollResult> {
    if (!supabase) return { found: false };
    const { data, error } = await supabase.rpc("get_order_by_temporary_order", {
      p_temporary_order_id: temporaryOrderId,
    });
    if (error) return { found: false };
    const result = data as {
      ok: boolean;
      found: boolean;
      order?: {
        ticket_number: number;
        status: OrderStatus;
        total_price: number;
        pickup_token: string | null;
        pickup_expires_at: string | null;
      };
    };
    if (!result.ok || !result.found || !result.order) return { found: false };
    return {
      found: true,
      ticket_number: result.order.ticket_number,
      status: result.order.status,
      total_price: result.order.total_price,
      pickup_token: result.order.pickup_token,
      pickup_expires_at: result.order.pickup_expires_at,
    };
  }

  async checkout(input: CheckoutInput) {
    return checkoutViaEdgeFunction(input);
  }

  async updateOrderStatus(
    orderId: string,
    _status: OrderStatus,
  ): Promise<boolean> {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc("advance_order_status", {
      p_order_id: orderId,
    });
    if (error) return false;
    return Boolean((data as { ok: boolean })?.ok);
  }

  async restoreOrder(orderId: string): Promise<boolean> {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc("restore_order_to_cooking", {
      p_order_id: orderId,
    });
    if (error) return false;
    return Boolean((data as { ok: boolean })?.ok);
  }

  async verifyPickup(input: { token: string; orderId?: string }) {
    if (!supabase)
      return { ok: false as const, message: "Supabaseが設定されていません" };
    const { data, error } = await supabase.rpc("verify_pickup_order", {
      p_token: input.token,
      p_order_id: input.orderId ?? null,
    });
    if (error) return { ok: false as const, message: error.message };
    const result = data as { ok: boolean; message?: string };
    if (!result.ok)
      return {
        ok: false as const,
        message: result.message ?? "確認に失敗しました",
      };
    return { ok: true as const };
  }
}

export const supabaseStore = new SupabaseStore();
