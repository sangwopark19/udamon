import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, apikey, x-client-info",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // JWT 토큰에서 사용자 인증
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return jsonResponse({ error: "Missing authorization token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 1. public.users soft delete
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        nickname: null, // 닉네임 해제 (재사용 가능)
      })
      .eq("id", user.id);

    if (updateError) {
      return jsonResponse({ error: "Failed to update user record" }, 500);
    }

    // 2. auth.users soft delete (service_role 필요)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id,
      true, // shouldSoftDelete = true
    );

    if (deleteError) {
      return jsonResponse({ error: "Failed to delete auth user" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[delete-account] Error:", message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
