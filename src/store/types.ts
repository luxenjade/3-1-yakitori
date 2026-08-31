import type {
  AppState,
  CartLine,
  CheckoutInput,
  CheckoutResponse,
  Item,
  OrderStatus,
  TemporaryOrder,
} from "../types";

export type PickupPollResult = {
  found: boolean;
  ticket_number?: number;
  status?: OrderStatus;
  total_price?: number;
  pickup_token?: string | null;
  pickup_expires_at?: string | null;
};

export interface Store {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AppState;

  getItem: (id: string) => Item | undefined;
  getWaitingCount: () => number;
  getEstimatedWaitMinutes: () => number;
  getSalesTotal: () => number;
  getCurrentCallingTicket: () => number | null;

  createTemporaryOrder: (lines: CartLine[]) => Promise<TemporaryOrder>;
  findTemporaryOrder: (opts: {
    id?: string;
    short_code?: string;
  }) => Promise<TemporaryOrder | undefined>;
  pollTemporaryOrderResult: (
    temporaryOrderId: string,
  ) => Promise<PickupPollResult>;

  checkout: (input: CheckoutInput) => Promise<CheckoutResponse>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  restoreOrder: (orderId: string) => Promise<boolean>;
  verifyPickup: (input: {
    token: string;
    orderId?: string;
  }) => Promise<{ ok: true } | { ok: false; message: string }>;
}
