/**
 * Supabase Edge Function: checkout
 * Performs stock decrement under row lock (SELECT FOR UPDATE) then creates an order.
 *
 * Deploy: supabase functions deploy checkout
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type CartLine = { item_id: string; quantity: number };
type PaymentMethod = "cash" | "ic";
type OrderSource = "mobile" | "pos";

interface CheckoutBody {
  temporary_order_id?: string;
  short_code?: string;
  lines?: CartLine[];
  payment_method: PaymentMethod;
  order_source: OrderSource;
  staff_passphrase?: string;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = (await req.json()) as CheckoutBody;
    const expectedPass = Deno.env.get("STAFF_PASSPHRASE");
    if (expectedPass && body.staff_passphrase !== expectedPass) {
      return json({ ok: false, message: "スタッフ認証に失敗しました" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Prefer a Postgres RPC that wraps SELECT FOR UPDATE in a transaction.
    // Create with: CREATE FUNCTION checkout_order(...) ...
    const { data, error } = await supabase.rpc("checkout_order", {
      p_temporary_order_id: body.temporary_order_id ?? null,
      p_short_code: body.short_code ?? null,
      p_lines: body.lines ?? null,
      p_payment_method: body.payment_method,
      p_order_source: body.order_source,
    });

    if (error) {
      return json({ ok: false, message: error.message }, 400);
    }

    return json(data ?? { ok: true, order: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "checkout failed";
    return json({ ok: false, message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
