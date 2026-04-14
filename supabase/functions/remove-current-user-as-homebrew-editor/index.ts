/**
 * remove-current-user-as-homebrew-editor — Remove the authenticated user from a homebrew collection's editors
 *
 * Ported from functions/src/index.ts:removeCurrentUserAsHomebrewCampaignEditor
 * Changed: Firestore writes (arrayRemove) → Supabase client + RPC
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

  const { homebrewCollectionId } = body as { homebrewCollectionId: string };
  if (!homebrewCollectionId) {
    return new Response(JSON.stringify(false), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createServiceRoleClient();

  const { error: rpcError } = await supabase.rpc("remove_homebrew_editor", {
    p_collection_id: homebrewCollectionId,
    p_user_id: user.id,
  });

  if (rpcError) {
    console.error("remove-current-user-as-homebrew-editor: failed to remove editor", rpcError);
    return new Response(JSON.stringify(false), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(
    JSON.stringify(true),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
