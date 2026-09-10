import { useAppState } from "../store/store-context";

export default function TopPage() {
  const state = useAppState();

  return (
    <div className="min-h-dvh bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <p className="text-5xl mb-4">🍢</p>
      <h1 className="text-3xl font-black">文化祭 焼き鳥店</h1>
      <p className="mt-2 text-neutral-400">
        湯煎解凍した鳥串をその場で焼き上げてご提供します
      </p>

      <div className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-900 px-10 py-8">
        <p className="text-neutral-400 text-sm">ただいまの待ち人数</p>
        <p className="text-7xl font-black text-emerald-400 mt-2">
          {state.status.waiting_count}人待ち
        </p>
      </div>

      <div className="mt-8 text-left max-w-sm space-y-1 text-sm text-neutral-400">
        <p>・お会計は紙の食券でお願いします</p>
        <p>・メニュー：もも（たれ／ガーリック塩）、かわ（たれ）</p>
      </div>
    </div>
  );
}
