import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { mockStoreAdapter } from "./mock-store-adapter";
import { supabaseStore } from "./supabase-store";
import type { Store } from "./types";
import type { AppState } from "../types";
import { isSupabaseConfigured } from "../lib/supabase";

const StoreContext = createContext<Store>(mockStoreAdapter);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useMemo<Store>(() => {
    if (isSupabaseConfigured) {
      supabaseStore.start();
      return supabaseStore;
    }
    return mockStoreAdapter;
  }, []);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  return useContext(StoreContext);
}

export function useAppState(): AppState {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
