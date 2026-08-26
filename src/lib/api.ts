import type { CheckoutInput, CheckoutResponse } from "../types";
import { isSupabaseConfigured, supabase } from "./supabase";
import { mockStore } from "../store/mock-store";

/**
 * Checkout entry point. Uses Edge Function when Supabase is configured;
 * otherwise falls back to the in-memory mock store.
 */
export async function checkout(input: CheckoutInput): Promise<CheckoutResponse> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke("checkout", {
      body: input,
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    return data as CheckoutResponse;
  }
  return mockStore.checkout(input);
}
