import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export type StaffRole = "pos" | "kitchen" | "signage" | "admin";

type StaffAuthValue = {
  loading: boolean;
  session: Session | null;
  role: StaffRole | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const StaffAuthContext = createContext<StaffAuthValue | null>(null);

async function fetchRole(session: Session | null): Promise<StaffRole | null> {
  if (!session || !supabase) return null;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.role as StaffRole;
}

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const update = async (nextSession: Session | null) => {
      const nextRole = await fetchRole(nextSession);
      if (!active) return;
      setSession(nextSession);
      setRole(nextRole);
      setError(nextSession && !nextRole ? "スタッフ権限が設定されていません" : null);
      setLoading(false);
    };

    void supabase.auth.getSession().then(({ data }) => update(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void update(nextSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<StaffAuthValue>(
    () => ({
      loading,
      session,
      role,
      error,
      async signIn(email, password) {
        if (!supabase) return "Supabaseが設定されていません";
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        return signInError?.message ?? null;
      },
      async signOut() {
        if (supabase) await supabase.auth.signOut();
      },
    }),
    [error, loading, role, session],
  );

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth() {
  const value = useContext(StaffAuthContext);
  if (!value) throw new Error("StaffAuthProvider が必要です");
  return value;
}
