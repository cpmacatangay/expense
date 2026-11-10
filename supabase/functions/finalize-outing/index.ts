import { createClient } from "npm:@supabase/supabase-js@2";
import { computeShares } from "./money/computeShares.ts";

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
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Function environment is not configured" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser();

    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const body = await request.json().catch(() => null);
    const outingId = body?.outingId;
    const expectedVersion = Number(body?.expectedVersion);

    if (typeof outingId !== "string" || !Number.isInteger(expectedVersion)) {
      return json({ error: "outingId and expectedVersion are required" }, 400);
    }

    const service = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: outing, error: outingError } = await service
      .from("outings")
      .select("id, group_id, status, total_mode, total_centavos, payer_adult_id, version")
      .eq("id", outingId)
      .single();

    if (outingError || !outing) return json({ error: "Outing not found" }, 404);
    if (outing.version !== expectedVersion) {
      return json({ error: "This outing changed on another device" }, 409);
    }
    if (outing.status !== "draft" && outing.status !== "reopened") {
      return json({ error: "This outing is not editable" }, 400);
    }

    const { data: group } = await service
      .from("groups")
      .select("owner_id")
      .eq("id", outing.group_id)
      .single();

    if (!group || group.owner_id !== user.id) {
      return json({ error: "Only the group owner can finalize" }, 403);
    }

    const [{ data: adultRows }, { data: studentRows }, { data: itemRows }] = await Promise.all([
      service.from("outing_adults").select("adult_id, present").eq("outing_id", outingId),
      service
        .from("outing_students")
        .select("student_id, present, covering_adult_id")
        .eq("outing_id", outingId),
      service
        .from("items")
        .select(
          "amount_centavos, assignment_type, assigned_adult_id, assigned_student_id"
        )
        .eq("outing_id", outingId)
    ]);

    const presentAdults = (adultRows ?? [])
      .filter((row) => row.present)
      .map((row) => row.adult_id);

    const presentStudents = (studentRows ?? [])
      .filter((row) => row.present && row.covering_adult_id)
      .map((row) => ({
        id: row.student_id,
        coveredByAdultId: row.covering_adult_id as string
      }));

    if (presentAdults.length < 2) {
      return json({ error: "At least two adults must be present" }, 400);
    }

    if (!outing.payer_adult_id || !presentAdults.includes(outing.payer_adult_id)) {
      return json({ error: "The payer must be present" }, 400);
    }

    let result;
    try {
      result = computeShares({
        presentAdults,
        presentStudents,
        items: (itemRows ?? []).map((item) => ({
          amountCentavos: item.amount_centavos,
          assignmentType: item.assignment_type,
          assignedAdultId: item.assigned_adult_id,
          assignedStudentId: item.assigned_student_id
        })),
        totalMode: outing.total_mode,
        manualTotalCentavos: outing.total_mode === "manual" ? outing.total_centavos : null,
        fixedTotalCentavos: outing.total_mode === "fixed" ? outing.total_centavos : null
      });
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Could not compute shares" },
        400
      );
    }

    if (result.totalCentavos <= 0) {
      return json({ error: "The total must be greater than zero" }, 400);
    }

    const { error: applyError } = await service.rpc("apply_finalization", {
      p_outing_id: outingId,
      p_actor_profile_id: user.id,
      p_expected_version: expectedVersion,
      p_total_centavos: result.totalCentavos,
      p_shares: result.shares
    });

    if (applyError) return json({ error: applyError.message }, 400);

    return json({ totalCentavos: result.totalCentavos, shares: result.shares });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Finalization failed" },
      500
    );
  }
});
