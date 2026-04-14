/**
 * get-homebrew-editor-invite-key — Get or create an invite key for a homebrew collection
 *
 * Ported from functions/src/index.ts:getHomebrewEditorInviteKey
 * Changed: Firestore reads/writes → Supabase client
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
    return new Response(JSON.stringify(null), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createServiceRoleClient();

  // Check user is an editor of the collection
  const { data: collection, error: collectionError } = await supabase
    .from("homebrew_collections")
    .select("id, editors")
    .eq("id", homebrewCollectionId)
    .single();

  if (collectionError || !collection) {
    console.warn("get-homebrew-editor-invite-key: collection not found", homebrewCollectionId);
    return new Response(JSON.stringify(null), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const editors: string[] = collection.editors ?? [];
  if (!editors.includes(user.id)) {
    console.warn("get-homebrew-editor-invite-key: user not an editor", user.id);
    return new Response(JSON.stringify(null), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Look for an existing invite key
  const { data: existingKeys } = await supabase
    .from("homebrew_editor_invite_keys")
    .select("id")
    .eq("collection_id", homebrewCollectionId)
    .limit(1);

  if (existingKeys && existingKeys.length > 0) {
    return new Response(
      JSON.stringify(existingKeys[0].id),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Create a new invite key
  const { data: newKey, error: insertError } = await supabase
    .from("homebrew_editor_invite_keys")
    .insert({ collection_id: homebrewCollectionId })
    .select("id")
    .single();

  if (insertError || !newKey) {
    console.error("get-homebrew-editor-invite-key: failed to create key", insertError);
    return new Response(JSON.stringify(null), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(
    JSON.stringify(newKey.id),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
