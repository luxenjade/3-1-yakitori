import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useAppState, useStore } from "../store/store-context";
import { useWakeLock } from "../hooks/useWakeLock";
import type { CartLine, Item, TemporaryOrder } from "../types";
import { cn } from "../lib/utils";

type View = "menu" | "qr" | "ticket";

function stockBadge(item: Item) {
  if (item.current_stock <= 0) {
    return { label: "完売", className: "bg-zinc-400 text-white" };
  }
  if (item.current_stock <= 10) {
    return { label: "残りわずか", className: "bg-amber-500 text-white" };
  }
  return { label: "在庫あり", className: "bg-emerald-500 text-white" };
}

export default function OrderPage() {
  const state = useAppState();
  const store = useStore();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [view, setView] = useState<View>("menu");
  const [tempOrder, setTempOrder] = useState<TemporaryOrder | null>(null);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useWakeLock(view === "qr" || view === "ticket");

  const lines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([item_id, quantity]) => ({ item_id, quantity })),
    [cart],
  );

  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const totalPrice = lines.reduce((s, l) => {
    const item = state.items.find((i) => i.id === l.item_id);
    return s + (item?.price ?? 0) * l.quantity;
  }, 0);

  const waiting = store.getWaitingCount();
  const eta = store.getEstimatedWaitMinutes();
  const calling = store.getCurrentCallingTicket();

  useEffect(() => {
    if (!tempOrder || view !== "qr" || ticketNumber !== null) return;
    const stillExists = state.temporaryOrders.some((o) => o.id === tempOrder.id);
    if (stillExists) return;
    const recent = [...state.orders]
      .filter((o) => o.total_price === tempOrder.total_price)
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];
    if (recent) {
      setTicketNumber(recent.ticket_number);
      setView("ticket");
    }
  }, [state.orders, state.temporaryOrders, tempOrder, view, ticketNumber]);

  const add = (item: Item) => {
    if (item.current_stock <= 0) return;
    setCart((prev) => {
      const next = (prev[item.id] ?? 0) + 1;
      if (next > item.current_stock) return prev;
      return { ...prev, [item.id]: next };
    });
  };

  const dec = (itemId: string) => {
    setCart((prev) => {
      const next = (prev[itemId] ?? 0) - 1;
      if (next <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const confirmTemp = () => {
    setError(null);
    try {
      const order = store.createTemporaryOrder(lines);
      setTempOrder(order);
      setCart({});
      setView("qr");
    } catch (e) {
      setError(e instanceof Error ? e.message : "仮注文に失敗しました");
    }
  };

  if (view === "ticket" && ticketNumber !== null) {
    return (
      <div className="min-h-dvh relative overflow-hidden flex flex-col items-center justify-center p-6 text-white">
        <div className="anti-forgery-bg absolute inset-0 -z-10" />
        <p className="text-lg font-medium opacity-90 mb-2">引き換え番号</p>
        <p className="text-6xl font-black tracking-tight mb-8">#{ticketNumber}</p>
        <p className="text-3xl font-bold mb-1">
          現在の呼出: {calling != null ? `#${calling}` : "—"}
        </p>
        <p className="text-sm opacity-80 mt-6 text-center max-w-xs">
          この画面を提供口でご提示ください。スクリーンショットでは背景が静止します。
        </p>
        <button
          type="button"
          className="mt-10 h-12 px-6 rounded-md bg-white/20 active:scale-95 transition-transform"
          onClick={() => {
            setView("menu");
            setTempOrder(null);
            setTicketNumber(null);
          }}
        >
          メニューに戻る
        </button>
      </div>
    );
  }

  if (view === "qr" && tempOrder) {
    const payload = JSON.stringify({
      type: "temp_order",
      id: tempOrder.id,
      code: tempOrder.short_code,
    });

    return (
      <div className="min-h-dvh bg-neutral-50 flex flex-col items-center p-6 pb-10">
        <div className="w-full max-w-md flex flex-col items-center">
          <h1 className="text-xl font-bold text-neutral-900 mb-1">仮注文QR</h1>
          <p className="text-sm text-neutral-500 mb-6 text-center">
            レジでこの画面をスキャンしてください
          </p>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
            <QRCodeSVG value={payload} size={220} level="M" />
          </div>
          <p className="mt-6 text-neutral-500 text-sm">手入力用コード</p>
          <p className="text-3xl font-black tracking-[0.2em] text-neutral-900 mt-1">
            {tempOrder.short_code}
          </p>
          <p className="mt-4 text-2xl font-bold">¥{tempOrder.total_price.toLocaleString()}</p>
          <p className="mt-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-center">
            レジで決済するまで商品は確保されません
          </p>
          <button
            type="button"
            className="mt-8 h-12 w-full max-w-xs rounded-md border border-neutral-300 text-neutral-700 active:scale-95 transition-transform"
            onClick={() => {
              setView("menu");
              setTempOrder(null);
            }}
          >
            メニューに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-neutral-50 pb-28">
      <header className="sticky top-0 z-20 bg-neutral-900 text-white px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight">焼き鳥</h1>
          <p className="text-sm text-neutral-300">
            待ち {waiting}組 / 約{eta}分
          </p>
        </div>
      </header>

      <ul className="p-4 space-y-3 max-w-lg mx-auto">
        {state.items.map((item) => {
          const badge = stockBadge(item);
          const qty = cart[item.id] ?? 0;
          const soldOut = item.current_stock <= 0;
          return (
            <li
              key={item.id}
              className={cn(
                "flex gap-3 items-center rounded-lg border border-neutral-200 bg-white p-3",
                soldOut && "opacity-50 grayscale",
              )}
            >
              <div className="h-16 w-16 rounded-md bg-neutral-100 flex items-center justify-center text-3xl shrink-0">
                {item.image_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-neutral-900 truncate">{item.name}</p>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-lg font-bold mt-0.5">¥{item.price}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={soldOut || qty === 0}
                  aria-label="減らす"
                  onClick={() => dec(item.id)}
                  className="h-12 w-12 rounded-md border border-neutral-300 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-8 text-center text-xl font-bold">{qty}</span>
                <button
                  type="button"
                  disabled={soldOut || qty >= item.current_stock}
                  aria-label="増やす"
                  onClick={() => add(item)}
                  className="h-12 w-12 rounded-md bg-neutral-900 text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="fixed bottom-28 inset-x-4 max-w-lg mx-auto text-center text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md py-2 px-3">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            <X className="inline h-3 w-3" />
          </button>
        </p>
      )}

      <div className="fixed bottom-0 inset-x-0 border-t border-neutral-200 bg-white p-4 safe-bottom">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-500 flex items-center gap-1">
              <ShoppingBag className="h-4 w-4" />
              {totalQty}点
            </p>
            <p className="text-2xl font-black">¥{totalPrice.toLocaleString()}</p>
          </div>
          <button
            type="button"
            disabled={totalQty === 0}
            onClick={confirmTemp}
            className="h-14 flex-1 max-w-[220px] rounded-md bg-neutral-900 text-white font-bold text-base active:scale-95 transition-transform disabled:opacity-40"
          >
            仮注文を確認する
          </button>
        </div>
      </div>
    </div>
  );
}
