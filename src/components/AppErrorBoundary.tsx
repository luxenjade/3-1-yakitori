import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Keeps a startup exception from turning the whole PWA into a blank screen. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("アプリ起動エラー", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-dvh grid place-items-center bg-neutral-950 p-6 text-white">
        <section className="w-full max-w-md rounded-xl border border-rose-400/40 bg-neutral-900 p-6">
          <h1 className="text-xl font-black">画面を表示できませんでした</h1>
          <p className="mt-2 text-sm text-neutral-300">最新版を読み込むため、再読み込みを試してください。</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 h-12 w-full rounded-md bg-emerald-600 font-bold">
            再読み込み
          </button>
          <p className="mt-4 break-words text-xs text-neutral-500">{this.state.error.message}</p>
        </section>
      </main>
    );
  }
}
