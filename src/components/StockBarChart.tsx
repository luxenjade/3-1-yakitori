import type { StockItem } from "../types";
import { cn } from "../lib/utils";

export function StockBarChart({
  stockItems,
  className,
}: {
  stockItems: StockItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-center gap-8 md:gap-12",
        className,
      )}
    >
      {stockItems.map((stock) => {
        const pct =
          stock.initial_stock > 0
            ? Math.max(
                0,
                Math.min(
                  100,
                  Math.round((stock.current_stock / stock.initial_stock) * 100),
                ),
              )
            : 0;
        const soldOut = stock.current_stock <= 0;

        return (
          <div key={stock.id} className="flex flex-col items-center">
            <p className="mb-2 text-sm font-bold tabular-nums text-white/80 md:text-base">
              {soldOut ? "完売" : `残り${stock.current_stock}本`}
            </p>
            <div className="relative flex h-40 w-10 items-end overflow-hidden rounded-t-md bg-black/30 md:h-56 md:w-14">
              {soldOut ? (
                <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#52525b_0,#52525b_4px,#3f3f46_4px,#3f3f46_8px)]" />
              ) : (
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-emerald-700 via-emerald-500 to-emerald-400 transition-[height] duration-700 ease-out motion-reduce:transition-none"
                  style={{ height: `${pct}%` }}
                />
              )}
            </div>
            <p className="mt-3 text-base font-bold text-white md:text-lg">
              {stock.name}
            </p>
          </div>
        );
      })}
    </div>
  );
}
