import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Check, Minus, Plus } from "lucide-react";
import { useAppState, useStore } from "../store/store-context";
import { useBeforeUnloadGuard } from "../hooks/useBeforeUnloadGuard";
import { checkout } from "../lib/api";
import type { CartLine, PaymentMethod, TemporaryOrder } from "../types";
import { cn } from "../lib/utils";

type Mode = "scan" | "keypad" | "manual";

export default function PosPage() {
  const state = useAppState();
  const store = useStore();
  useBeforeUnloadGuard(true);

  const [mode, setMode] = useState<Mode>("scan");
  const [code, setCode] = useState("");
  const [temp, setTemp] = useState<TemporaryOrder | null>(null);
  const [manualCart, setManualCart] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerQueueRef = useRef<Promise<void>>(Promise.resolve());
  const desiredModeRef = useRef<Mode>("scan");
  const disposedRef = useRef(false);
  const decodedRef = useRef(false);
  const scanBoxId = "pos-qr-reader";

  const loadByCode = useCallback(
    async (raw: string) => {
      setError(null);
      let short = raw.trim().toUpperCase();
      try {
        const parsed = JSON.parse(raw) as { code?: string; id?: string };
        if (parsed.code) short = parsed.code.toUpperCase();
        const found = await store.findTemporaryOrder({
          id: parsed.id,
          short_code: parsed.code ?? short,
        });
        if (found) {
          setTemp(found);
          setMode("keypad");
          return;
        }
      } catch {
        // plain short code
      }
      const found = await store.findTemporaryOrder({ short_code: short });
      if (!found) {
        setError("仮注文が見つかりません");
        setTemp(null);
        return;
      }
      setTemp(found);
    },
    [store],
  );

  const loadByCodeRef = useRef(loadByCode);
  useEffect(() => {
    loadByCodeRef.current = loadByCode;
  }, [loadByCode]);

  const enqueueScannerOperation = useCallback(
    (operation: () => Promise<void>) => {
      const next = scannerQueueRef.current.then(operation, operation);
      scannerQueueRef.current = next.catch(() => undefined);
      return next;
    },
    [],
  );

  useEffect(() => {
    disposedRef.current = false;
    const scanner = new Html5Qrcode(scanBoxId);
    scannerRef.current = scanner;

    return () => {
      disposedRef.current = true;
      if (scannerRef.current === scanner) scannerRef.current = null;
      void enqueueScannerOperation(async () => {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      });
    };
  }, [enqueueScannerOperation]);

  useEffect(() => {
    desiredModeRef.current = mode;
    const scanner = scannerRef.current;
    if (!scanner) return;

    if (mode !== "scan") {
      void enqueueScannerOperation(async () => {
        if (scanner.isScanning) await scanner.stop();
      });
      return;
    }

    void enqueueScannerOperation(async () => {
      if (
        disposedRef.current ||
        scannerRef.current !== scanner ||
        desiredModeRef.current !== "scan" ||
        scanner.isScanning
      ) {
        return;
      }

      decodedRef.current = false;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (
              disposedRef.current ||
              scannerRef.current !== scanner ||
              desiredModeRef.current !== "scan" ||
              decodedRef.current
            ) {
              return;
            }
            decodedRef.current = true;
            void loadByCodeRef.current(decoded);
          },
          () => undefined,
        );
      } catch {
        if (!disposedRef.current && desiredModeRef.current === "scan") {
          setError("カメラを起動できません。手入力タブを使ってください");
        }
      }
    });
  }, [mode, enqueueScannerOperation]);

  const switchMode = (nextMode: Mode) => {
    setError(null);
    setMode(nextMode);
  };

  const displayLines: CartLine[] = temp
    ? temp.items.map((i) => ({ item_id: i.item_id, quantity: i.quantity }))
    : Object.entries(manualCart)
        .filter(([, q]) => q > 0)
        .map(([item_id, quantity]) => ({ item_id, quantity }));

  const total = displayLines.reduce((sum, line) => {
    const item = state.items.find((i) => i.id === line.item_id);
    return sum + (item?.price ?? 0) * line.quantity;
  }, 0);

  const bumpManual = (itemId: string, delta: number) => {
    setTemp(null);
    setManualCart((prev) => {
      const item = state.items.find((i) => i.id === itemId);
      if (!item) return prev;
      const next = (prev[itemId] ?? 0) + delta;
      if (next <= 0) {
        return Object.fromEntries(
          Object.entries(prev).filter(([id]) => id !== itemId),
        );
      }
      if (next > item.current_stock) return prev;
      return { ...prev, [itemId]: next };
    });
  };

  const adjustTempQty = (itemId: string, delta: number) => {
    if (!temp) return;
    setTemp((prev) => {
      if (!prev) return prev;
      const items = prev.items
        .map((line) =>
          line.item_id === itemId
            ? { ...line, quantity: Math.max(0, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0);
      const total_price = items.reduce((sum, line) => {
        const item = state.items.find((i) => i.id === line.item_id);
        return sum + (item?.price ?? 0) * line.quantity;
      }, 0);
      return { ...prev, items, total_price };
    });
  };

  const pay = async (method: PaymentMethod) => {
    if (displayLines.length === 0 || paying) return;
    setPaying(true);
    setError(null);
    const result = await checkout({
      temporary_order_id: temp?.id,
      short_code: temp?.short_code,
      lines: displayLines,
      payment_method: method,
      order_source: temp ? "mobile" : "pos",
    });
    setPaying(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(true);
    setTemp(null);
    setManualCart({});
    setCode("");
    window.setTimeout(() => {
      setSuccess(false);
      setMode("scan");
    }, 1000);
  };

  // Mobile側で生成している短縮コード文字（mock-store の shortCode と同じ集合）を使う
  // - I / O を除外（視認性対策）
  // - 0 / 1 も除外（画像/表示で紛れやすい）
  const keypadKeys = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "J",
    "K",
    "L",
    "M",
    "N",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "←",
    "確定",
  ];

  return (
    <div className="min-h-dvh bg-neutral-100 flex flex-col">
      <header className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-black">会計レジ</h1>
        <div className="flex rounded-md overflow-hidden border border-neutral-600 text-sm">
          {(
            [
              ["scan", "QR"],
              ["keypad", "手入力"],
              ["manual", "直接"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "h-10 px-3 active:scale-95 transition-transform",
                mode === m
                  ? "bg-white text-neutral-900 font-bold"
                  : "text-neutral-300",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40 max-w-xl mx-auto w-full">
        <div
          className={cn(
            "rounded-lg overflow-hidden bg-black aspect-square max-h-72 mx-auto w-full relative",
            // 内部で生成される video / canvas タグを領域いっぱいに正方形で収めるためのスタイル
            "[&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_canvas]:absolute [&_canvas]:inset-0",
            mode !== "scan" && "hidden",
          )}
        >
          <div
            id={scanBoxId}
            className="w-full h-full flex items-center justify-center"
          />
        </div>
        {mode === "keypad" && (
          <div className="space-y-3">
            <p className="text-center text-3xl font-black tracking-[0.25em] min-h-[2.5rem]">
              {code || "------"}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {keypadKeys.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="h-12 rounded-md bg-white border border-neutral-200 text-lg font-bold active:scale-95 transition-transform"
                  onClick={() => {
                    if (k === "←") setCode((c) => c.slice(0, -1));
                    else if (k === "確定") void loadByCode(code);
                    else if (code.length < 6) setCode((c) => c + k);
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "manual" && (
          <ul className="space-y-2">
            {state.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 bg-white rounded-md border border-neutral-200 p-2"
              >
                <span className="text-2xl">{item.image_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.name}</p>
                  <p className="text-sm text-neutral-500">¥{item.price}</p>
                </div>
                <button
                  type="button"
                  className="h-12 w-12 rounded-md border flex items-center justify-center active:scale-95"
                  onClick={() => bumpManual(item.id, -1)}
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-8 text-center text-xl font-bold">
                  {manualCart[item.id] ?? 0}
                </span>
                <button
                  type="button"
                  className="h-12 w-12 rounded-md bg-neutral-900 text-white flex items-center justify-center active:scale-95"
                  onClick={() => bumpManual(item.id, 1)}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {(temp || displayLines.length > 0) && mode !== "manual" && (
          <section className="bg-white rounded-lg border border-neutral-200 p-4 space-y-2">
            <h2 className="font-bold text-neutral-700">注文内容</h2>
            {displayLines.map((line) => {
              const item = state.items.find((i) => i.id === line.item_id);
              if (!item) return null;
              return (
                <div
                  key={line.item_id}
                  className="flex items-center gap-2 py-1"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-neutral-500">
                      ¥{item.price} × {line.quantity}
                    </p>
                  </div>
                  {temp && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="h-12 w-12 rounded-md border active:scale-95 flex items-center justify-center"
                        onClick={() => adjustTempQty(line.item_id, -1)}
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="text-2xl font-bold w-8 text-center">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        className="h-12 w-12 rounded-md border active:scale-95 flex items-center justify-center"
                        onClick={() => adjustTempQty(line.item_id, 1)}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  <p className="text-lg font-bold w-20 text-right">
                    ¥{(item.price * line.quantity).toLocaleString()}
                  </p>
                </div>
              );
            })}
            <p className="text-3xl font-black pt-2 border-t">
              ¥{total.toLocaleString()}
            </p>
          </section>
        )}

        {mode === "manual" && displayLines.length > 0 && (
          <p className="text-3xl font-black text-right">
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
            disabled={displayLines.length === 0 || paying}
            onClick={() => void pay("cash")}
            className="h-16 rounded-md bg-emerald-600 text-white text-lg font-bold active:scale-95 transition-transform disabled:opacity-40"
          >
            現金でお会計
          </button>
          <button
            type="button"
            disabled={displayLines.length === 0 || paying}
            onClick={() => void pay("ic")}
            className="h-16 rounded-md bg-sky-500 text-white text-lg font-bold active:scale-95 transition-transform disabled:opacity-40"
          >
            交通系IC
          </button>
        </div>
      </div>

      {success && (
        <div className="fixed inset-0 z-50 bg-emerald-600 flex flex-col items-center justify-center text-white animate-in">
          <Check className="h-28 w-28 stroke-[3]" />
          <p className="text-4xl font-black mt-4">会計完了</p>
        </div>
      )}
    </div>
  );
}
