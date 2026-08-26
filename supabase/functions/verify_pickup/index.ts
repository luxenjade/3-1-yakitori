/**
 * Supabase Edge Function: verify_pickup
 *
 * Validates `pickup_token` under row locks (via verify_pickup_order RPC),
 * then marks the order as `completed`.
 *
 * Deploy:
 * supabase functions deploy verify_pickup
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, message: "認証が必要です" }, 401);
    }

    const body = (await req.json()) as {
      token: string;
      order_id?: string | null;
    };

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ ok: false, message: "認証ユーザーを確認できません" }, 401);
    }

    const { data: roleRow, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleRow || !["kitchen", "admin"].includes(roleRow.role)) {
      return json({ ok: false, message: "verify_pickup の権限がありません" }, 403);
    }

    const { data, error } = await userClient.rpc("verify_pickup_order", {
      p_token: body.token,
      p_order_id: body.order_id ?? null,
    });

    if (error) {
      return json({ ok: false, message: error.message }, 400);
    }

    return json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "verify_pickup failed";
    return json({ ok: false, message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

