import {
  createContext,
  createElement,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { mockStore } from "./mock-store";
import type { AppState, Item } from "../types";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const StoreContext = createContext(mockStore);

const itemEmoji: Record<string, string> = {
  "もも（タレ）": "🍗",
  "ねぎま（タレ）": "🧅",
  "つくね（タレ）": "🍡",
  "かわ（塩）": "🔥",
  "ささみ（塩）": "🥩",
  "お茶": "🍵",
};

type DbItem = Omit<Item, "image_emoji">;

function toItem(item: DbItem): Item {
  return { ...item, image_emoji: itemEmoji[item.name] ?? "🍢" };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let active = true;
    const loadItems = async () => {
      const { data, error } = await supabase.from("items").select("*").order("created_at");
      if (error) {
        console.error("Supabaseの商品取得に失敗しました", error.message);
        return;
      }
      if (active && data) mockStore.replaceItems(data.map(toItem));
    };

    void loadItems();
    const channel = supabase
      .channel("public:items")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => {
        void loadItems();
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return createElement(StoreContext.Provider, { value: mockStore }, children);
}

export function useStore() {
  return useContext(StoreContext);
}

export function useAppState(): AppState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
