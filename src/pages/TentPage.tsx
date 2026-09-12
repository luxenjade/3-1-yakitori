import { useEffect, useMemo, useState } from "react";
import { Ban, Clock, Send } from "lucide-react";
import { useAppState, useStore } from "../store/store-context";
import { useBeforeUnloadGuard } from "../hooks/useBeforeUnloadGuard";
import { cn } from "../lib/utils";

function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export default function TentPage() {
  const state = useAppState();
  const store = useStore();
  useBeforeUnloadGuard(true);
  const [, setTick] = useState(0);
  const [momoQty, setMomoQty] = useState(30);
  const [kawaQty, setKawaQty] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  const pending = state.boilBatches.find((b) => b.status === "requested");
  const inProgress = useMemo(
    () =>
      state.boilBatches
        .filter((b) => b.status === "accepted")
        .sort((a, b) => new Date(a.accepted_at ?? 0).getTime() - new Date(b.accepted_at ?? 0).getTime()),
    [state.boilBatches],
  );
  const delivered = useMemo(
    () =>
      state.boilBatches
        .filter((b) => b.status === "delivered")
        .sort((a, b) => new Date(b.delivered_at ?? 0).getTime() - new Date(a.delivered_at ?? 0).getTime()),
    [state.boilBatches],
  );
  const totals = useMemo(
    () =>
      delivered.reduce(
        (acc, b) => ({ momo: acc.momo + b.momo_qty, kawa: acc.kawa + b.kawa_qty }),
        { momo: 0, kawa: 0 },
      ),
    [delivered],
  );

  const total = momoQty + kawaQty;
  const canSubmit = !pending && total > 0 && total <= 60;

  const bump = (which: "momo" | "kawa", delta: number) => {
    if (which === "momo") {
      setMomoQty((v) => Math.max(0, Math.min(60 - kawaQty, v + delta)));
    } else {
      setKawaQty((v) => Math.max(0, Math.min(60 - momoQty, v + delta)));
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await store.requestBoilBatch(momoQty, kawaQty);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "リクエストに失敗しました");
      return;
    }
    setMomoQty(30);
    setKawaQty(30);
  };

  const cancel = async (id: string) => {
    setError(null);
    const result = await store.cancelBoilBatch(id);
    if (!result.ok) setError(result.message ?? "取り消しに失敗しました");
  };

  return (
    <div className="min-h-dvh bg-neutral-950 text-white flex flex-col">
      <header className="px-4 py-3 border-b border-neutral-700">
        <h1 className="text-xl font-black">テント｜湯煎リクエスト</h1>
        <p className="text-sm text-neutral-400 mt-1">
          次に湯煎してほしい本数を10本単位で指定してください（合計60本まで）
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-xl mx-auto w-full">
        {pending ? (
          <section className="rounded-lg border border-amber-500 bg-amber-500/10 p-4">
            <p className="text-amber-400 font-bold flex items-center gap-2">
              <Clock className="h-4 w-4" /> 受理待ち（調理室からの受理をお待ちください）
            </p>
            <p className="mt-2 text-2xl font-black">
              もも {pending.momo_qty}本 / かわ {pending.kawa_qty}本
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              リクエストから {minutesSince(pending.requested_at)}分経過
            </p>
            <button
              type="button"
              onClick={() => void cancel(pending.id)}
              className="mt-3 h-11 px-4 rounded-md border border-neutral-600 flex items-center gap-2 active:scale-95 transition-transform"
            >
              <Ban className="h-4 w-4" /> リクエストを取り消す
            </button>
          </section>
        ) : (
          <section className="rounded-lg border border-neutral-700 bg-neutral-900 p-4 space-y-4">
            <p className="font-bold text-neutral-300">次のリクエスト内容</p>
            <QtyStepper label="もも" value={momoQty} onChange={(d) => bump("momo", d)} />
            <QtyStepper label="かわ" value={kawaQty} onChange={(d) => bump("kawa", d)} />
            <p className={cn("text-sm font-bold", total > 60 ? "text-rose-400" : "text-neutral-400")}>
              合計 {total}本 / 60本
            </p>
            {error && (
              <p className="text-sm bg-rose-950 border border-rose-800 text-rose-300 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() => void submit()}
              className="h-14 w-full rounded-md bg-emerald-600 font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
            >
              <Send className="h-5 w-5" /> リクエストを送信
            </button>
          </section>
        )}

        <section>
          <h2 className="font-bold text-neutral-300 mb-2">仕込み中（湯煎中）</h2>
          {inProgress.length === 0 ? (
            <p className="text-neutral-500 text-sm">現在、仕込み中の便はありません</p>
          ) : (
            <ul className="space-y-2">
              {inProgress.map((b) => {
                const mins = b.accepted_at ? minutesSince(b.accepted_at) : 0;
                const remaining = Math.max(0, 10 - mins);
                return (
                  <li key={b.id} className="rounded-md bg-neutral-900 border border-neutral-700 p-3">
                    <p className="font-bold">
                      もも {b.momo_qty}本 / かわ {b.kawa_qty}本
                    </p>
                    <p className="text-sm text-neutral-400 mt-1">
                      {remaining > 0 ? `湯煎完了まで約${remaining}分` : "湯煎完了・届くのを待っています"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-bold text-neutral-300 mb-2">直近の到着</h2>
          {delivered.length === 0 ? (
            <p className="text-neutral-500 text-sm">まだ届いた便はありません</p>
          ) : (
            <ul className="space-y-1">
              {delivered.slice(0, 5).map((b) => (
                <li
                  key={b.id}
                  className="text-sm flex justify-between text-neutral-300 border-b border-neutral-800 py-1"
                >
                  <span>{b.delivered_at ? new Date(b.delivered_at).toLocaleTimeString("ja-JP") : "-"}</span>
                  <span>
                    もも{b.momo_qty} / かわ{b.kawa_qty}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-neutral-500 mt-2">
            本日の湯煎実績: もも {totals.momo}本 / かわ {totals.kawa}本
          </p>
        </section>
      </div>
    </div>
  );
}

function QtyStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-bold text-lg">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(-10)}
          disabled={value <= 0}
          className="h-12 w-12 rounded-md border border-neutral-600 text-xl font-bold active:scale-95 transition-transform disabled:opacity-30"
        >
          −
        </button>
        <span className="w-16 text-center text-2xl font-black tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(10)}
          className="h-12 w-12 rounded-md bg-neutral-800 border border-neutral-600 text-xl font-bold active:scale-95 transition-transform"
        >
          ＋
        </button>
      </div>
    </div>
  );
}