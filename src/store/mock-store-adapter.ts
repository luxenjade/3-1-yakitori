import { mockStore } from "./mock-store";
import type { Store, PickupPollResult } from "./types";
import type { CartLine, CheckoutInput, OrderStatus } from "../types";

export const mockStoreAdapter: Store = {
  subscribe: mockStore.subscribe,
  getSnapshot: mockStore.getSnapshot,
  getItem: (id) => mockStore.getItem(id),
  getWaitingCount: () => mockStore.getWaitingCount(),
  getEstimatedWaitMinutes: () => mockStore.getEstimatedWaitMinutes(),
  getSalesTotal: () => mockStore.getSalesTotal(),
  getCurrentCallingTicket: () => mockStore.getCurrentCallingTicket(),

  createTemporaryOrder: async (lines: CartLine[]) =>
    mockStore.createTemporaryOrder(lines),
  findTemporaryOrder: async (opts) => mockStore.findTemporaryOrder(opts),

  pollTemporaryOrderResult: async (
    temporaryOrderId,
  ): Promise<PickupPollResult> => {
    const order = mockStore.getOrderByTemporaryOrderId(temporaryOrderId);
    if (!order) return { found: false };
    return {
      found: true,
      ticket_number: order.ticket_number,
      status: order.status,
      total_price: order.total_price,
      pickup_token:
        order.status === "ready" ? (order.pickup_token ?? null) : null,
      pickup_expires_at:
        order.status === "ready" ? (order.pickup_expires_at ?? null) : null,
    };
  },

  checkout: async (input: CheckoutInput) => mockStore.checkout(input),
  updateOrderStatus: async (orderId, status: OrderStatus) =>
    mockStore.updateOrderStatus(orderId, status),
  restoreOrder: async (orderId) => mockStore.restoreOrder(orderId),
  verifyPickup: async (input) => mockStore.verifyPickup(input),
};
