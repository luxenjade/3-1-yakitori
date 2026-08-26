import {
  createContext,
  createElement,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { mockStore } from "./mock-store";
import type { AppState } from "../types";

const StoreContext = createContext(mockStore);

export function StoreProvider({ children }: { children: ReactNode }) {
  return createElement(StoreContext.Provider, { value: mockStore }, children);
}

export function useStore() {
  return useContext(StoreContext);
}

export function useAppState(): AppState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
