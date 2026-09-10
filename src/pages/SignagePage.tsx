import { useAppState } from "../store/store-context";
import { Progress } from "../components/ui/progress";

export default function SignagePage() {
  const state = useAppState();
  const sales = state.sales.reduce((sum, s) => sum + s.total_price, 0);
  const goal = state.status.sales_goal;
  const pct = goal > 0 ? Math.min(100, Math.round((sales / goal) * 100)) : 0;

  return (
    <div className="min-h-dvh bg-neutral-950 text-white p-6 md:p-10">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full min-h-[calc(100dvh-5rem)]">
        <section className="lg:col-span-2 flex flex-col items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 p-8">
          <p className="text-2xl text-neutral-400 font-medium mb-4">
            ただいまの待ち人数
          </p>
          <p className="text-7xl md:text-8xl font-black text-emerald-500">
            {state.status.waiting_count}人
          </p>
        </section>

        <section className="lg:col-span-3 flex flex-col gap-6">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <h2 className="text-xl text-neutral-400 font-semibold mb-4">
              在庫状況
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {state.stockItems.map((stock) => {
                const pctLeft =
                  stock.initial_stock > 0
                    ? Math.round(
                        (stock.current_stock / stock.initial_stock) * 100,
                      )
                    : 0;
                const soldOut = stock.current_stock <= 0;
                return (
                  <div key={stock.id} className="rounded-xl bg-neutral-800 p-4">
                    <p className="text-lg font-bold">{stock.name}</p>
                    {soldOut ? (
                      <p className="text-2xl font-black text-zinc-400 mt-2">
                        完売
                      </p>
                    ) : (
                      <>
                        <p className="text-3xl font-black mt-2">
                          残り {stock.current_stock}本
                        </p>
                        <Progress value={pctLeft} className="h-3 mt-2" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-6">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-xl text-neutral-400 font-semibold">
                売上目標
              </h2>
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
  );
}
