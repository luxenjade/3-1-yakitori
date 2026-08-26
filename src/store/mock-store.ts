import type {
  AppState,
  CartLine,
  CheckoutInput,
  CheckoutResponse,
  Item,
  Order,
  OrderStatus,
  TemporaryOrder,
} from "../types";

function uid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function shortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function pickupToken(): string {
  // For verification at the pickup counter.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const SEED_ITEMS: Omit<Item, "created_at">[] = [
  {
    id: "item-momo",
    name: "もも（タレ）",
    price: 200,
    initial_stock: 80,
    current_stock: 80,
    status: "active",
    image_emoji: "🍗",
  },
  {
    id: "item-negima",
    name: "ねぎま（タレ）",
    price: 200,
    initial_stock: 70,
    current_stock: 70,
    status: "active",
    image_emoji: "🧅",
  },
  {
    id: "item-tsukune",
    name: "つくね（タレ）",
    price: 220,
    initial_stock: 60,
    current_stock: 60,
    status: "active",
    image_emoji: "🍡",
  },
  {
    id: "item-kawa",
    name: "かわ（塩）",
    price: 180,
    initial_stock: 50,
    current_stock: 50,
    status: "active",
    image_emoji: "🔥",
  },
  {
    id: "item-sasami",
    name: "ささみ（塩）",
    price: 200,
    initial_stock: 40,
    current_stock: 40,
    status: "active",
    image_emoji: "🥩",
  },
  {
    id: "item-drink",
    name: "お茶",
    price: 100,
    initial_stock: 100,
    current_stock: 100,
    status: "active",
    image_emoji: "🍵",
  },
];

function createInitialState(): AppState {
  const created_at = nowIso();
  return {
    items: SEED_ITEMS.map((item) => ({ ...item, created_at })),
    temporaryOrders: [],
    orders: [],
    salesGoal: 50000,
  };
}

type Listener = () => void;

class MockStore {
  private state: AppState = createInitialState();
  private listeners = new Set<Listener>();
  private nextTicket = 100;
  private locked = false;
  private pickupLocked = false;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AppState => this.state;

  /** Hydrates the demo store with the public catalog from Supabase. */
  replaceItems(items: Item[]) {
    this.setState((prev) => ({ ...prev, items }));
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  private setState(partial: Partial<AppState> | ((prev: AppState) => AppState)) {
    this.state =
      typeof partial === "function" ? partial(this.state) : { ...this.state, ...partial };
    this.emit();
  }

  getItem(id: string): Item | undefined {
    return this.state.items.find((i) => i.id === id);
  }

  getWaitingCount(): number {
    return this.state.orders.filter(
      (o) => o.status === "pending" || o.status === "cooking" || o.status === "ready",
    ).length;
  }

  getEstimatedWaitMinutes(): number {
    const active = this.getWaitingCount();
    return Math.max(1, Math.ceil(active * 1.5));
  }

  createTemporaryOrder(lines: CartLine[]): TemporaryOrder {
    if (lines.length === 0) {
      throw new Error("カートが空です");
    }

    const orderItems = lines.map((line) => {
      const item = this.getItem(line.item_id);
      if (!item) throw new Error("商品が見つかりません");
      if (item.current_stock < line.quantity) {
        throw new Error(`${item.name} の在庫が不足しています`);
      }
      return {
        id: uid(),
        temporary_order_id: "",
        item_id: line.item_id,
        quantity: line.quantity,
      };
    });

    const total = orderItems.reduce((sum, line) => {
      const item = this.getItem(line.item_id)!;
      return sum + item.price * line.quantity;
    }, 0);

    const id = uid();
    const order: TemporaryOrder = {
      id,
      short_code: shortCode(),
      total_price: total,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      created_at: nowIso(),
      items: orderItems.map((line) => ({ ...line, temporary_order_id: id })),
    };

    this.setState((prev) => ({
      ...prev,
      temporaryOrders: [...prev.temporaryOrders, order],
    }));

    return order;
  }

  findTemporaryOrder(opts: {
    id?: string;
    short_code?: string;
  }): TemporaryOrder | undefined {
    const { id, short_code } = opts;
    return this.state.temporaryOrders.find((o) => {
      if (id && o.id === id) return true;
      if (short_code && o.short_code.toUpperCase() === short_code.toUpperCase()) {
        return true;
      }
      return false;
    });
  }

  /** Row-lock equivalent: serializes checkout to prevent oversell. */
  checkout(input: CheckoutInput): CheckoutResponse {
    if (this.locked) {
      return { ok: false, message: "別の会計処理中です。少し待って再試行してください" };
    }
    this.locked = true;
    try {
      return this.checkoutLocked(input);
    } finally {
      this.locked = false;
    }
  }

  private checkoutLocked(input: CheckoutInput): CheckoutResponse {
    let lines: CartLine[] = [];
    let temporary: TemporaryOrder | undefined;
    let orderSource: OrderSource;

    if (input.temporary_order_id || input.short_code) {
      temporary = this.findTemporaryOrder({
        id: input.temporary_order_id,
        short_code: input.short_code,
      });
      if (!temporary) {
        return { ok: false, message: "仮注文が見つかりません（期限切れの可能性）" };
      }
      if (new Date(temporary.expires_at).getTime() < Date.now()) {
        return { ok: false, message: "仮注文の有効期限が切れています" };
      }
      // POS may adjust quantities before payment
      lines =
        input.lines && input.lines.length > 0
          ? input.lines
          : temporary.items.map((i) => ({
              item_id: i.item_id,
              quantity: i.quantity,
            }));
      orderSource = "mobile";
    } else if (input.lines && input.lines.length > 0) {
      lines = input.lines;
      orderSource = "pos";
    } else {
      return { ok: false, message: "注文内容が空です" };
    }

    // Validate stock (SELECT FOR UPDATE equivalent)
    for (const line of lines) {
      const item = this.getItem(line.item_id);
      if (!item) return { ok: false, message: "商品が見つかりません" };
      if (item.current_stock < line.quantity) {
        return {
          ok: false,
          message: `${item.name} の在庫不足（残り ${item.current_stock}）`,
        };
      }
    }

    const total = lines.reduce((sum, line) => {
      const item = this.getItem(line.item_id)!;
      return sum + item.price * line.quantity;
    }, 0);

    const orderId = uid();
    const ticket = this.nextTicket++;
    const order: Order = {
      id: orderId,
      ticket_number: ticket,
      total_price: total,
      payment_method: input.payment_method,
      status: "pending",
      order_source: orderSource,
      created_at: nowIso(),
      pickup_token: null,
      pickup_expires_at: null,
      pickup_used_at: null,
      items: lines.map((line) => ({
        id: uid(),
        order_id: orderId,
        item_id: line.item_id,
        quantity: line.quantity,
      })),
    };

    this.setState((prev) => {
      const items = prev.items.map((item) => {
        const line = lines.find((l) => l.item_id === item.id);
        if (!line) return item;
        const nextStock = item.current_stock - line.quantity;
        return {
          ...item,
          current_stock: nextStock,
          status: nextStock <= 0 ? ("sold_out" as const) : item.status,
        };
      });

      return {
        ...prev,
        items,
        orders: [...prev.orders, order],
        temporaryOrders: temporary
          ? prev.temporaryOrders.filter((o) => o.id !== temporary.id)
          : prev.temporaryOrders,
      };
    });

    return { ok: true, order };
  }

  updateOrderStatus(orderId: string, status: OrderStatus): boolean {
    const exists = this.state.orders.some((o) => o.id === orderId);
    if (!exists) return false;

    this.setState((prev) => {
      const now = nowIso();

      return {
        ...prev,
        orders: prev.orders.map((o) => {
          if (o.id !== orderId) return o;

          if (status === "ready") {
            return {
              ...o,
              status,
              pickup_token: pickupToken(),
              pickup_expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
              pickup_used_at: null,
            };
          }

          if (status === "completed") {
            return {
              ...o,
              status,
              pickup_used_at: o.pickup_used_at ?? now,
            };
          }

          // cooking / pending: clear token (so customer can't use stale screenshots)
          return {
            ...o,
            status,
            pickup_token: null,
            pickup_expires_at: null,
          };
        }),
      };
    });

    return true;
  }

  restoreOrder(orderId: string): boolean {
    return this.updateOrderStatus(orderId, "cooking");
  }

  verifyPickup(input: { token: string; orderId?: string }): { ok: true } | { ok: false; message: string } {
    if (this.pickupLocked) {
      return { ok: false, message: "別の受け取り確認が処理中です。少し待ってください" };
    }
    this.pickupLocked = true;
    try {
      const token = input.token.trim().toUpperCase();
      if (!token) return { ok: false, message: "トークンが空です" };

      const order = input.orderId
        ? this.state.orders.find((o) => o.id === input.orderId)
        : this.state.orders.find((o) => (o.pickup_token ?? "") === token);

      if (!order) return { ok: false, message: "一致する注文が見つかりません" };
      if (order.status !== "ready")
        return { ok: false, message: "この注文は受け取り準備完了ではありません" };
      if (!order.pickup_token || !order.pickup_expires_at)
        return { ok: false, message: "受け取りトークンが無効です" };
      if (order.pickup_token !== token) return { ok: false, message: "トークンが一致しません" };
      if (new Date(order.pickup_expires_at).getTime() < Date.now()) {
        return { ok: false, message: "トークンの有効期限が切れています" };
      }
      if (order.pickup_used_at) return { ok: false, message: "この注文は既に確認済みです" };

      // Mark completed under a critical section (row-lock equivalent)
      this.setState((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === order.id
            ? { ...o, status: "completed", pickup_used_at: nowIso() }
            : o,
        ),
      }));

      return { ok: true };
    } finally {
      this.pickupLocked = false;
    }
  }

  getSalesTotal(): number {
    return this.state.orders.reduce((sum, o) => sum + o.total_price, 0);
  }

  getCurrentCallingTicket(): number | null {
    const ready = this.state.orders
      .filter((o) => o.status === "ready")
      .sort((a, b) => a.ticket_number - b.ticket_number);
    return ready[0]?.ticket_number ?? null;
  }
}

export const mockStore = new MockStore();
