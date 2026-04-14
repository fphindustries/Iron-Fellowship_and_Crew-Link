/**
 * get-homebrew-id-from-invite-key — Resolve an invite key to a homebrew collection ID
 *
 * Ported from functions/src/index.ts:getHomebrewIdFromInviteKey
 * Changed: Firestore reads → Supabase client
 */
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthUser, createServiceRoleClient } from "../_shared/supabase-client.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const user = await getAuthUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    const raw = await req.json();
    body = raw.data ?? raw;
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const { inviteKey } = body as { inviteKey: string };
  if (!inviteKey) {
    return new Response(JSON.stringify(null), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("homebrew_editor_invite_keys")
    .select("collection_id")
    .eq("id", inviteKey)
    .single();

  if (error || !data?.collection_id) {
    console.error("get-homebrew-id-from-invite-key: key not found", inviteKey);
    return new Response(JSON.stringify(null), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(
    JSON.stringify(data.collection_id),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
