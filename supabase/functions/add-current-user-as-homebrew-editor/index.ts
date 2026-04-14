/**
 * add-current-user-as-homebrew-editor — Add the authenticated user to a homebrew collection's editors
 *
 * Ported from functions/src/index.ts:addCurrentUserAsHomebrewCampaignEditor
 * Changed: Firestore reads/writes (arrayUnion) → Supabase client + RPC
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

  const { inviteKey, homebrewCollectionId } = body as {
    inviteKey: string;
    homebrewCollectionId: string;
  };

  if (!inviteKey || !homebrewCollectionId) {
    return new Response(JSON.stringify(false), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createServiceRoleClient();

  // Validate that the invite key resolves to the claimed collection
  const { data: keyData, error: keyError } = await supabase
    .from("homebrew_editor_invite_keys")
    .select("collection_id")
    .eq("id", inviteKey)
    .single();

  if (keyError || !keyData?.collection_id) {
    console.error("add-current-user-as-homebrew-editor: invite key not found", inviteKey);
    return new Response(JSON.stringify(false), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (keyData.collection_id !== homebrewCollectionId) {
    console.error("add-current-user-as-homebrew-editor: collection ID mismatch", {
      expected: homebrewCollectionId,
      found: keyData.collection_id,
    });
    return new Response(JSON.stringify(false), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Add user to editors array via RPC (handles array union safely)
  const { error: rpcError } = await supabase.rpc("add_homebrew_editor", {
    p_collection_id: homebrewCollectionId,
    p_user_id: user.id,
  });

  if (rpcError) {
    console.error("add-current-user-as-homebrew-editor: failed to add editor", rpcError);
    return new Response(JSON.stringify(false), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(
    JSON.stringify(true),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
