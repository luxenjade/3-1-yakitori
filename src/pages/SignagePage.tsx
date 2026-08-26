import { useAppState, useStore } from "../store/store-context";
import { Progress } from "../components/ui/progress";

export default function SignagePage() {
  const state = useAppState();
  const store = useStore();

  const calling = store.getCurrentCallingTicket();
  const cooking = state.orders
    .filter((o) => o.status === "pending" || o.status === "cooking")
    .sort((a, b) => a.ticket_number - b.ticket_number)
    .map((o) => o.ticket_number);

  const soldOut = state.items.filter((i) => i.current_stock <= 0);
  const sales = store.getSalesTotal();
  const goal = state.salesGoal;
  const pct = Math.min(100, Math.round((sales / goal) * 100));

  return (
    <div className="min-h-dvh bg-neutral-950 text-white p-6 md:p-10">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full min-h-[calc(100dvh-5rem)]">
        <section className="lg:col-span-3 flex flex-col items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 p-8">
          <p className="text-2xl md:text-3xl text-neutral-400 font-medium mb-4">
            お呼び出し中の番号
          </p>
          {calling != null ? (
            <p className="text-7xl md:text-9xl font-black text-emerald-500 animate-bounce">
              #{calling}
            </p>
          ) : (
            <p className="text-5xl font-bold text-neutral-600">—</p>
          )}
        </section>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="flex-1 rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <h2 className="text-xl text-neutral-400 font-semibold mb-4">ただいま調理中</h2>
            <div className="flex flex-wrap gap-3">
              {cooking.length === 0 && (
                <span className="text-neutral-600 text-2xl">準備中の注文はありません</span>
              )}
              {cooking.map((n) => (
                <span key={n} className="text-3xl font-bold text-slate-400">
                  #{n}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <div>
              <h2 className="text-xl text-neutral-400 font-semibold mb-2">完売情報</h2>
              {soldOut.length === 0 ? (
                <p className="text-emerald-400 text-lg font-medium">現在完売なし</p>
              ) : (
                <ul className="space-y-1">
                  {soldOut.map((item) => (
                    <li key={item.id} className="text-2xl font-bold text-zinc-400">
                      {item.image_emoji} {item.name} — 完売
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-xl text-neutral-400 font-semibold">売上目標</h2>
                <p className="text-2xl font-black">
                  ¥{sales.toLocaleString()}
                  <span className="text-base font-medium text-neutral-500">
                    {" "}
                    / ¥{goal.toLocaleString()}
                  </span>
                </p>
              </div>
              <Progress value={pct} className="h-4" />
              <p className="text-right text-emerald-400 font-bold mt-1">{pct}%</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
