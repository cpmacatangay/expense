import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Not authenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Function environment is not configured" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser();

    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const { data: allowance, error: allowanceError } = await userClient.rpc(
      "can_delete_account"
    );
    if (allowanceError) return json({ error: allowanceError.message }, 400);

    const canDelete = Boolean((allowance as { canDelete?: boolean } | null)?.canDelete);
    if (!canDelete) {
      return json(
        { error: "Settle your balances before deleting your account" },
        409
      );
    }

    const service = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
    if (deleteError) return json({ error: "Could not delete the account" }, 400);

    return json({ deleted: true });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Could not delete the account"
      },
      500
    );
  }
});
