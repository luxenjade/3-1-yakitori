/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  readonly type: "screen";
  release(): Promise<void>;
}

interface WakeLock {
  request(type: "screen"): Promise<WakeLockSentinel>;
}

interface Navigator {
  readonly wakeLock?: WakeLock;
}
