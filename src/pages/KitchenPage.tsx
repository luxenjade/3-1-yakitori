import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { History, RotateCcw, ScanLine } from "lucide-react";
import { useAppState, useStore } from "../store/store-context";
import { useWakeLock } from "../hooks/useWakeLock";
import { useBeforeUnloadGuard } from "../hooks/useBeforeUnloadGuard";
import type { Order } from "../types";
import { cn } from "../lib/utils";

function elapsedMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

const PICKUP_SCAN_BOX_ID = "kitchen-pickup-scanner";

export default function KitchenPage() {
  const state = useAppState();
  const store = useStore();
  useWakeLock(true);
  useBeforeUnloadGuard(true);
  const [, setTick] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [verifyOrderId, setVerifyOrderId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const decodedLockRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  const activeOrders = useMemo(
    () =>
      state.orders
        .filter(
          (o) =>
            o.status === "pending" ||
            o.status === "cooking" ||
            o.status === "ready",
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    [state.orders],
  );

  const completed = useMemo(
    () =>
      state.orders
        .filter((o) => o.status === "completed")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
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
      void store.updateOrderStatus(order.id, "cooking");
    } else if (order.status === "cooking") {
      void store.updateOrderStatus(order.id, "ready");
    }
  };

  const startLongPress = (order: Order) => {
    if (order.status !== "ready") return;
    pressTimer.current = window.setTimeout(() => {
      decodedLockRef.current = false;
      setVerifyError(null);
      setVerifyOrderId(order.id);
    }, 1000);
  };

  const clearLongPress = () => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // 受け取り確認モーダルが開いている間だけカメラを起動する。
  // QRを読み取ったら即座に verifyPickup を呼び、成功すればモーダルを閉じる。
  // 不一致の場合はエラーを一時表示し、カメラは止めずに再スキャンを受け付ける。
  useEffect(() => {
    if (!verifyOrderId) return;

    let cancelled = false;
    const scanner = new Html5Qrcode(PICKUP_SCAN_BOX_ID);
    let cameraFailed = false;

    const handleDecode = async (decodedText: string) => {
      if (cancelled || decodedLockRef.current) return;
      decodedLockRef.current = true;
      setVerifying(true);
      const result = await store.verifyPickup({
        token: decodedText.trim(),
        orderId: verifyOrderId,
      });
      if (cancelled) return;
      setVerifying(false);
      if (!result.ok) {
        setVerifyError(result.message);
        window.setTimeout(() => {
          decodedLockRef.current = false;
          if (!cancelled) setVerifyError(null);
        }, 1500);
        return;
      }
      setVerifyOrderId(null);
    };

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => void handleDecode(decoded),
          () => undefined,
        );
      } catch {
        if (!cancelled) {
          cameraFailed = true;
          setVerifyError(
            "カメラを起動できません。カメラの許可設定を確認してください",
          );
        }
      }
    };
    void start();

    return () => {
      cancelled = true;
      if (!cameraFailed) {
        void scanner
          .stop()
          .catch(() => undefined)
          .then(() => scanner.clear());
      } else {
        scanner.clear();
      }
    };
  }, [verifyOrderId, store]);

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
          <p className="text-sm text-neutral-400 mb-2">
            完了履歴（タップで調理中に戻す）
          </p>
          <ul className="space-y-1">
            {completed.length === 0 && (
              <li className="text-neutral-500 text-sm">履歴なし</li>
            )}
            {completed.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => void store.restoreOrder(o.id)}
                  className="w-full flex items-center gap-2 h-12 px-3 rounded-md bg-neutral-900 active:scale-95 transition-transform text-left"
                >
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                  <span className="font-bold">#{o.ticket_number}</span>
                  <span className="text-neutral-400 text-sm">
                    ¥{o.total_price}
                  </span>
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
                  <span className="text-4xl font-black">
                    #{order.ticket_number}
                  </span>
                  <span className="text-sm font-semibold">{mins}分経過</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wide mt-1 opacity-80">
                  {order.status === "pending" && "調理待ち · タップで調理開始"}
                  {order.status === "cooking" && "調理中 · タップで提供可"}
                  {order.status === "ready" && "提供可 · 1秒長押しでQRスキャン"}
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
          <p className="text-center text-neutral-500 mt-20 text-lg">
            注文待ち...
          </p>
        )}
      </div>

      {verifyOrderId && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
            <div className="flex items-center gap-2">
              <ScanLine className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl font-black">受け取り確認 · QRスキャン</h2>
            </div>
            <p className="text-neutral-400 text-sm mt-1">
              顧客が表示している画面のQRコードにカメラを向けてください
            </p>

            <div className="mt-4 rounded-lg overflow-hidden bg-black aspect-square max-h-80 mx-auto w-full relative">
              <div id={PICKUP_SCAN_BOX_ID} className="w-full h-full" />
              {verifying && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <p className="text-white font-bold">確認中...</p>
                </div>
              )}
            </div>

            {verifyError && (
              <p className="mt-3 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-md px-3 py-2">
                {verifyError}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setVerifyOrderId(null);
                setVerifyError(null);
              }}
              className="mt-4 h-12 w-full rounded-md bg-neutral-800 border border-neutral-700 active:scale-95 transition-transform"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
