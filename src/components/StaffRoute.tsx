import { useState, type FormEvent, type ReactNode } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import { useStaffAuth, type StaffRole } from "../auth/staff-auth";

export function StaffRoute({ roles, children }: { roles: StaffRole[]; children: ReactNode }) {
  const auth = useStaffAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isSupabaseConfigured) return <>{children}</>;
  if (auth.loading) {
    return <main className="min-h-dvh grid place-items-center bg-neutral-950 text-white">認証を確認中...</main>;
  }
  if (auth.session && auth.role && roles.includes(auth.role)) {
    return (
      <>
        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="fixed right-2 top-2 z-[200] h-9 rounded-md border border-white/30 bg-black/50 px-3 text-xs text-white backdrop-blur"
        >
          ログアウト
        </button>
        {children}
      </>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const message = await auth.signIn(email, password);
    setSubmitting(false);
    if (message) setFormError(message);
  };

  return (
    <main className="min-h-dvh grid place-items-center bg-neutral-950 p-4 text-white">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-700 bg-neutral-900 p-6">
        <div>
          <h1 className="text-2xl font-black">スタッフログイン</h1>
          <p className="mt-1 text-sm text-neutral-400">担当アカウントでログインしてください。</p>
        </div>
        <label className="block text-sm font-medium">
          メールアドレス
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required className="mt-1 h-12 w-full rounded-md border border-neutral-600 bg-neutral-800 px-3" />
        </label>
        <label className="block text-sm font-medium">
          パスワード
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required className="mt-1 h-12 w-full rounded-md border border-neutral-600 bg-neutral-800 px-3" />
        </label>
        {(formError ?? auth.error) && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError ?? auth.error}</p>}
        <button type="submit" disabled={submitting} className="h-12 w-full rounded-md bg-emerald-600 font-bold disabled:opacity-50">
          {submitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </main>
  );
}
