import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useAppState, useStore } from "../store/store-context";
import { useBeforeUnloadGuard } from "../hooks/useBeforeUnloadGuard";
import type { PaymentMethod } from "../types";
import { cn } from "../lib/utils";

export default function CashierPage() {
  const state = useAppState();
  const store = useStore();
  useBeforeUnloadGuard(true);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([menu_item_id, quantity]) => ({ menu_item_id, quantity })),
    [cart],
  );

  const total = lines.reduce((sum, l) => {
    const menu = state.menuItems.find((m) => m.id === l.menu_item_id);
    return sum + (menu?.price ?? 0) * l.quantity;
  }, 0);

  const bump = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      const next = (prev[menuItemId] ?? 0) + delta;
      if (next <= 0) {
        const { [menuItemId]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuItemId]: next };
    });
  };

  const pay = async (method: PaymentMethod) => {
    if (lines.length === 0 || paying) return;
    setPaying(true);
    setError(null);
    const result = await store.recordSale(lines, method);
    setPaying(false);
    if (!result.ok) {
      setError(result.message ?? "会計に失敗しました");
      return;
    }
    setSuccess(true);
    setCart({});
    window.setTimeout(() => setSuccess(false), 1000);
  };

  return (
    <div className="min-h-dvh bg-neutral-100 flex flex-col">
      <header className="bg-neutral-900 text-white px-4 py-3">
        <h1 className="text-xl font-black">会計入力</h1>
        <p className="text-sm text-neutral-400 mt-1">
          食券の内容を入力して会計してください
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-48 max-w-xl mx-auto w-full">
        {state.menuItems.map((menu) => {
          const stock = state.stockItems.find(
            (s) => s.id === menu.stock_item_id,
          );
          const soldOut = (stock?.current_stock ?? 0) <= 0;
          const qty = cart[menu.id] ?? 0;
          return (
            <div
              key={menu.id}
              className={cn(
                "flex items-center gap-2 bg-white rounded-lg border border-neutral-200 p-3",
                soldOut && "opacity-50",
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{menu.name}</p>
                <p className="text-sm text-neutral-500">
                  ¥{menu.price}
                  {soldOut && (
                    <span className="ml-2 text-rose-600 font-semibold">
                      完売
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={qty === 0}
                onClick={() => bump(menu.id, -1)}
                className="h-12 w-12 rounded-md border flex items-center justify-center active:scale-95 disabled:opacity-40"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="w-8 text-center text-xl font-bold">{qty}</span>
              <button
                type="button"
                disabled={soldOut}
                onClick={() => bump(menu.id, 1)}
                className="h-12 w-12 rounded-md bg-neutral-900 text-white flex items-center justify-center active:scale-95 disabled:opacity-40"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          );
        })}

        {lines.length > 0 && (
          <p className="text-3xl font-black text-right pt-2">
            ¥{total.toLocaleString()}
          </p>
        )}

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 p-3 bg-white border-t border-neutral-200">
        <div className="max-w-xl mx-auto grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={lines.length === 0 || paying}
            onClick={() => void pay("cash")}
            className="h-16 rounded-md bg-emerald-600 text-white text-lg font-bold active:scale-95 transition-transform disabled:opacity-40"
          >
            現金でお会計
          </button>
          <button
            type="button"
            disabled={lines.length === 0 || paying}
            onClick={() => void pay("ic")}
            className="h-16 rounded-md bg-sky-500 text-white text-lg font-bold active:scale-95 transition-transform disabled:opacity-40"
          >
            交通系IC
          </button>
        </div>
      </div>

      {success && (
        <div className="fixed inset-0 z-50 bg-emerald-600 flex flex-col items-center justify-center text-white">
          <Check className="h-28 w-28 stroke-[3]" />
          <p className="text-4xl font-black mt-4">会計完了</p>
        </div>
      )}
    </div>
  );
}
