import { useState } from "react";
import { useAppState, useStore } from "../store/store-context";

export default function AdminPage() {
  const state = useAppState();
  const store = useStore();
  const [waitingInput, setWaitingInput] = useState(
    String(state.status.waiting_count),
  );
  const [goalInput, setGoalInput] = useState(String(state.status.sales_goal));
  const [saving, setSaving] = useState(false);

  const total = state.sales.reduce((s, sale) => s + sale.total_price, 0);
  const perMenuTotals = state.menuItems.map((menu) => {
    const qty = state.sales
      .flatMap((s) => s.items)
      .filter((i) => i.menu_item_id === menu.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    return { menu, qty, revenue: qty * menu.price };
  });

  const submitWaiting = async () => {
    const n = Number(waitingInput);
    if (!Number.isFinite(n) || n < 0) return;
    setSaving(true);
    await store.updateWaitingCount(Math.round(n));
    setSaving(false);
  };

  const submitGoal = async () => {
    const n = Number(goalInput);
    if (!Number.isFinite(n) || n < 0) return;
    setSaving(true);
    await store.updateSalesGoal(Math.round(n));
    setSaving(false);
  };

  return (
    <div className="min-h-dvh bg-neutral-100 p-4 pb-16">
      <h1 className="text-2xl font-black mb-4">売上管理</h1>

      <section className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
        <h2 className="font-bold mb-3">待ち人数・目標の更新</h2>
        <div className="flex items-end gap-3 flex-wrap">
          <label className="text-sm">
            待ち人数
            <input
              value={waitingInput}
              onChange={(e) => setWaitingInput(e.target.value)}
              inputMode="numeric"
              className="mt-1 block h-12 w-28 rounded-md border border-neutral-300 px-3 text-lg"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submitWaiting()}
            className="h-12 px-4 rounded-md bg-neutral-900 text-white font-bold active:scale-95"
          >
            更新
          </button>

          <label className="text-sm ml-4">
            売上目標
            <input
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              inputMode="numeric"
              className="mt-1 block h-12 w-32 rounded-md border border-neutral-300 px-3 text-lg"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submitGoal()}
            className="h-12 px-4 rounded-md bg-neutral-900 text-white font-bold active:scale-95"
          >
            更新
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
        <h2 className="font-bold mb-3">在庫</h2>
        <ul className="space-y-1">
          {state.stockItems.map((s) => (
            <li key={s.id} className="flex justify-between text-sm">
              <span>{s.name}</span>
              <span>
                {s.current_stock} / {s.initial_stock}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
        <h2 className="font-bold mb-3">商品別集計</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-1">商品</th>
              <th className="py-1 text-right">数量</th>
              <th className="py-1 text-right">売上</th>
            </tr>
          </thead>
          <tbody>
            {perMenuTotals.map(({ menu, qty, revenue }) => (
              <tr key={menu.id} className="border-t">
                <td className="py-1">{menu.name}</td>
                <td className="py-1 text-right">{qty}</td>
                <td className="py-1 text-right">¥{revenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right font-black text-xl mt-3">
          合計 ¥{total.toLocaleString()}
        </p>
      </section>

      <section className="bg-white rounded-lg border border-neutral-200 p-4">
        <h2 className="font-bold mb-3">会計履歴（最新300件）</h2>
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {state.sales.map((sale) => (
            <li
              key={sale.id}
              className="text-sm border-b pb-2 flex justify-between"
            >
              <span>
                {new Date(sale.created_at).toLocaleTimeString("ja-JP")}
              </span>
              <span className="font-bold">
                ¥{sale.total_price.toLocaleString()} (
                {sale.payment_method === "cash" ? "現金" : "IC"})
              </span>
            </li>
          ))}
          {state.sales.length === 0 && (
            <li className="text-neutral-400 text-sm">まだ会計がありません</li>
          )}
        </ul>
      </section>
    </div>
  );
}
