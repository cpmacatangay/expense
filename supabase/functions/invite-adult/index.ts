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
    if (!authorization) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Function environment is not configured" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } }
    });
    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser();

    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (name.length < 1 || name.length > 50) {
      return json({ error: "Adult name must be 1-50 characters" }, 400);
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "Enter a valid email address" }, 400);
    }

    const service = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: group, error: groupError } = await service
      .from("groups")
      .select("id, owner_id, status")
      .eq("owner_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (groupError) return json({ error: groupError.message }, 400);
    if (!group) return json({ error: "Only the group owner can invite adults" }, 403);

    const { error: createError } = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { salo_invite: true }
    });

    if (createError && !/already|registered|exists/i.test(createError.message)) {
      return json({ error: createError.message }, 400);
    }

    const { data: invitation, error: inviteError } = await userClient.rpc("create_invitation", {
      adult_display_name: name,
      invitee_email: email
    });

    if (inviteError) return json({ error: inviteError.message }, 400);

    return json(invitation);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Could not create the invitation" },
      500
    );
  }
});
