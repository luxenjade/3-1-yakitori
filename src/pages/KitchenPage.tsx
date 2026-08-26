import { useEffect, useMemo, useRef, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { useAppState, useStore } from "../store/store-context";
import { useWakeLock } from "../hooks/useWakeLock";
import { useBeforeUnloadGuard } from "../hooks/useBeforeUnloadGuard";
import type { Order } from "../types";
import { cn } from "../lib/utils";

function elapsedMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export default function KitchenPage() {
  const state = useAppState();
  const store = useStore();
  useWakeLock(true);
  useBeforeUnloadGuard(true);
  const [, setTick] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [verifyOrderId, setVerifyOrderId] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  const activeOrders = useMemo(
    () =>
      state.orders
        .filter((o) => o.status === "pending" || o.status === "cooking" || o.status === "ready")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [state.orders],
  );

  const completed = useMemo(
    () =>
      state.orders
        .filter((o) => o.status === "completed")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20),
    [state.orders],
  );

  const summary = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of activeOrders) {
      for (const line of order.items) {
        const item = state.items.find((i) => i.id === line.item_id);
        if (!item) continue;
        map.set(item.name, (map.get(item.name) ?? 0) + line.quantity);
      }
    }
    return [...map.entries()];
  }, [activeOrders, state.items]);

  const onCardTap = (order: Order) => {
    if (order.status === "pending") {
      store.updateOrderStatus(order.id, "cooking");
    } else if (order.status === "cooking") {
      store.updateOrderStatus(order.id, "ready");
    }
  };

  const startLongPress = (order: Order) => {
    if (order.status !== "ready") return;
    pressTimer.current = window.setTimeout(() => {
      setVerifyOrderId(order.id);
      setVerifyToken("");
      setVerifyError(null);
    }, 1000);
  };

  const clearLongPress = () => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="min-h-dvh bg-neutral-900 text-white flex flex-col">
      <header className="px-4 py-3 border-b border-neutral-700 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black">キッチン</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.length === 0 ? (
              <span className="text-neutral-400 text-sm">待機なし</span>
            ) : (
              summary.map(([name, qty]) => (
                <span
                  key={name}
                  className="text-sm bg-neutral-800 border border-neutral-600 rounded px-2 py-1"
                >
                  {name}: 合計 {qty}個
                </span>
              ))
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="h-12 px-3 rounded-md bg-neutral-800 border border-neutral-600 flex items-center gap-2 active:scale-95 transition-transform shrink-0"
        >
          <History className="h-5 w-5" />
          履歴・復元
        </button>
      </header>

      {showHistory && (
        <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-3 max-h-48 overflow-y-auto">
          <p className="text-sm text-neutral-400 mb-2">完了履歴（タップで調理中に戻す）</p>
          <ul className="space-y-1">
            {completed.length === 0 && (
              <li className="text-neutral-500 text-sm">履歴なし</li>
            )}
            {completed.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => store.restoreOrder(o.id)}
                  className="w-full flex items-center gap-2 h-12 px-3 rounded-md bg-neutral-900 active:scale-95 transition-transform text-left"
                >
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                  <span className="font-bold">#{o.ticket_number}</span>
                  <span className="text-neutral-400 text-sm">¥{o.total_price}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {activeOrders.map((order) => {
            const mins = elapsedMinutes(order.created_at);
            const late = mins >= 3;
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => onCardTap(order)}
                onPointerDown={() => startLongPress(order)}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                onPointerCancel={clearLongPress}
                className={cn(
                  "text-left rounded-lg border-2 p-4 active:scale-[0.98] transition-transform",
                  late
                    ? "bg-rose-50 border-rose-500 text-neutral-900 animate-pulse"
                    : order.status === "ready"
                      ? "bg-emerald-500 border-emerald-400 text-white"
                      : order.status === "cooking"
                        ? "bg-amber-500 border-amber-400 text-neutral-900"
                        : "bg-slate-500 border-slate-400 text-white",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-4xl font-black">#{order.ticket_number}</span>
                  <span className="text-sm font-semibold">{mins}分経過</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide mt-1 opacity-80">
                  {order.status === "pending" && "調理待ち · タップで調理開始"}
                  {order.status === "cooking" && "調理中 · タップで提供可"}
                  {order.status === "ready" && "提供可 · 1秒長押しでコード確認"}
                </p>
                <ul className="mt-3 space-y-1">
                  {order.items.map((line) => {
                    const item = state.items.find((i) => i.id === line.item_id);
                    return (
                      <li key={line.id} className="text-lg font-bold">
                        {item?.name ?? "?"} × {line.quantity}
                      </li>
                    );
                  })}
                </ul>
              </button>
            );
          })}
        </div>
        {activeOrders.length === 0 && (
          <p className="text-center text-neutral-500 mt-20 text-lg">注文待ち...</p>
        )}
      </div>

      {verifyOrderId && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
            <h2 className="text-xl font-black">受け取り確認</h2>
            <p className="text-neutral-400 text-sm mt-1">
              顧客が表示している「コード」を入力（または表示のQRを読み取って下さい）
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-sm text-neutral-400 block">コード (6桁 + 文字)</label>
              <input
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value.toUpperCase())}
                className="w-full h-12 rounded-md bg-neutral-800 border border-neutral-700 px-3 text-lg font-bold tracking-[0.12em] outline-none"
                placeholder="例: AB12CD34"
                inputMode="text"
              />
              {verifyError && (
                <p className="text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-md px-3 py-2">
                  {verifyError}
                </p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setVerifyOrderId(null);
                  setVerifyToken("");
                  setVerifyError(null);
                }}
                className="h-12 flex-1 rounded-md bg-neutral-800 border border-neutral-700 active:scale-95 transition-transform"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  const result = store.verifyPickup({
                    token: verifyToken,
                    orderId: verifyOrderId,
                  });
                  if (!result.ok) {
                    setVerifyError(result.message);
                    return;
                  }
                  setVerifyOrderId(null);
                  setVerifyToken("");
                  setVerifyError(null);
                }}
                className="h-12 flex-1 rounded-md bg-emerald-600 font-bold text-white active:scale-95 transition-transform"
              >
                確認して完了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
