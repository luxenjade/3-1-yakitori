import { useEffect, useMemo, useState } from "react";
import { Check, Flame, Inbox } from "lucide-react";
import { useAppState, useStore } from "../store/store-context";
import { useWakeLock } from "../hooks/useWakeLock";
import { useBeforeUnloadGuard } from "../hooks/useBeforeUnloadGuard";
import { cn } from "../lib/utils";

function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export default function KitchenRoomPage() {
  const state = useAppState();
  const store = useStore();
  useWakeLock(true);
  useBeforeUnloadGuard(true);
  const [, setTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  const requested = useMemo(
    () =>
      state.boilBatches
        .filter((b) => b.status === "requested")
        .sort((a, b) => new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime()),
    [state.boilBatches],
  );
  const boiling = useMemo(
    () =>
      state.boilBatches
        .filter((b) => b.status === "accepted")
        .sort((a, b) => new Date(a.accepted_at ?? 0).getTime() - new Date(b.accepted_at ?? 0).getTime()),
    [state.boilBatches],
  );
  const delivered = useMemo(() => state.boilBatches.filter((b) => b.status === "delivered"), [state.boilBatches]);
  const totals = useMemo(
    () =>
      delivered.reduce(
        (acc, b) => ({ momo: acc.momo + b.momo_qty, kawa: acc.kawa + b.kawa_qty }),
        { momo: 0, kawa: 0 },
      ),
    [delivered],
  );

  const accept = async (id: string) => {
    setBusyId(id);
    setError(null);
    const result = await store.acceptBoilBatch(id);
    setBusyId(null);
    if (!result.ok) setError(result.message ?? "受理に失敗しました");
  };

  const deliver = async (id: string) => {
    setBusyId(id);
    setError(null);
    const result = await store.deliverBoilBatch(id);
    setBusyId(null);
    if (!result.ok) setError(result.message ?? "配達完了にできませんでした");
  };

  return (
    <div className="min-h-dvh bg-neutral-900 text-white flex flex-col">
      <header className="px-4 py-3 border-b border-neutral-700">
        <h1 className="text-xl font-black">調理室｜湯煎管理</h1>
        <p className="text-sm text-neutral-400 mt-1">
          本日の湯煎実績: もも {totals.momo}本 / かわ {totals.kawa}本
        </p>
      </header>

      {error && (
        <p className="mx-4 mt-3 text-sm bg-rose-950 border border-rose-800 text-rose-300 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl mx-auto w-full">
        <section>
          <h2 className="font-bold text-neutral-300 mb-2 flex items-center gap-2">
            <Inbox className="h-4 w-4" /> リクエスト待ち
          </h2>
          {requested.length === 0 ? (
            <p className="text-neutral-500 text-sm">新しいリクエストはありません</p>
          ) : (
            <ul className="space-y-2">
              {requested.map((b) => (
                <li
                  key={b.id}
                  className="rounded-lg border-2 border-sky-500 bg-sky-500/10 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-2xl font-black">
                      もも {b.momo_qty}本 / かわ {b.kawa_qty}本
                    </p>
                    <p className="text-sm text-neutral-400 mt-1">
                      リクエストから {minutesSince(b.requested_at)}分経過
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={() => void accept(b.id)}
                    className="h-14 px-5 rounded-md bg-sky-500 font-bold flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
                  >
                    <Flame className="h-5 w-5" /> 受理して湯煎開始
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-bold text-neutral-300 mb-2 flex items-center gap-2">
            <Flame className="h-4 w-4" /> 湯煎中
          </h2>
          {boiling.length === 0 ? (
            <p className="text-neutral-500 text-sm">現在、湯煎中の便はありません</p>
          ) : (
            <ul className="space-y-2">
              {boiling.map((b) => {
                const mins = b.accepted_at ? minutesSince(b.accepted_at) : 0;
                const ready = mins >= 10;
                return (
                  <li
                    key={b.id}
                    className={cn(
                      "rounded-lg border-2 p-4 flex items-center justify-between gap-3",
                      ready ? "border-emerald-500 bg-emerald-500/10" : "border-amber-500 bg-amber-500/10",
                    )}
                  >
                    <div>
                      <p className="text-2xl font-black">
                        もも {b.momo_qty}本 / かわ {b.kawa_qty}本
                      </p>
                      <p className={cn("text-sm mt-1 font-semibold", ready ? "text-emerald-400" : "text-amber-400")}>
                        {ready ? "湯煎完了・配達できます" : `湯煎中（残り約${10 - mins}分）`}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => void deliver(b.id)}
                      className="h-14 px-5 rounded-md bg-emerald-600 font-bold flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
                    >
                      <Check className="h-5 w-5" /> テントへ配達完了
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}