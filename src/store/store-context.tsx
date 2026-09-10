import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { dataStore } from "./data-store";
import type {
  AppState,
  PaymentMethod,
  RecordSaleResult,
  SaleLine,
} from "../types";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type StoreApi = {
  recordSale: (
    lines: SaleLine[],
    paymentMethod: PaymentMethod,
  ) => Promise<RecordSaleResult>;
  updateWaitingCount: (n: number) => Promise<void>;
  updateSalesGoal: (n: number) => Promise<void>;
};

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;

    const loadAll = async () => {
      const [
        { data: stock },
        { data: menu },
        { data: sales },
        { data: status },
      ] = await Promise.all([
        supabase.from("stock_items").select("*").order("created_at"),
        supabase.from("menu_items").select("*").order("created_at"),
        supabase
          .from("sales")
          .select("*, sale_items(*)")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase.from("store_status").select("*").limit(1).maybeSingle(),
      ]);
      if (!active) return;
      if (stock) dataStore.replaceStockItems(stock);
      if (menu) dataStore.replaceMenuItems(menu);
      if (sales) {
        dataStore.replaceSales(
          sales.map((s) => ({
            id: s.id,
            total_price: s.total_price,
            payment_method: s.payment_method,
            created_at: s.created_at,
            items: (s.sale_items ?? []).map(
              (i: {
                id: string;
                menu_item_id: string;
                quantity: number;
                unit_price: number;
              }) => ({
                id: i.id,
                menu_item_id: i.menu_item_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
              }),
            ),
          })),
        );
      }
      if (status) dataStore.replaceStatus(status);
    };

    void loadAll();
    const channel = supabase
      .channel("public:operations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_items" },
        () => void loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => void loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sale_items" },
        () => void loadAll(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_status" },
        () => void loadAll(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const recordSale = useCallback(
    async (
      lines: SaleLine[],
      paymentMethod: PaymentMethod,
    ): Promise<RecordSaleResult> => {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc("record_sale", {
          p_lines: lines,
          p_payment_method: paymentMethod,
        });
        if (error) return { ok: false, message: error.message };
        return data as RecordSaleResult;
      }
      return dataStore.recordSaleLocal(lines, paymentMethod);
    },
    [],
  );

  const updateWaitingCount = useCallback(async (n: number) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.rpc("update_store_status", {
        p_waiting_count: n,
        p_sales_goal: null,
      });
      return;
    }
    dataStore.updateWaitingCountLocal(n);
  }, []);

  const updateSalesGoal = useCallback(async (n: number) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.rpc("update_store_status", {
        p_waiting_count: null,
        p_sales_goal: n,
      });
      return;
    }
    dataStore.updateSalesGoalLocal(n);
  }, []);

  const api: StoreApi = { recordSale, updateWaitingCount, updateSalesGoal };

  return createElement(StoreContext.Provider, { value: api }, children);
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("StoreProvider が必要です");
  return value;
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    dataStore.subscribe,
    dataStore.getSnapshot,
    dataStore.getSnapshot,
  );
}
