import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateNote = createApiFunction<
  {
    campaignId: string | undefined;
    characterId: string | undefined;
    noteId: string;
    title: string;
    content?: Uint8Array;
    isBeaconRequest?: boolean;
  },
  void
>(async (params) => {
  const { campaignId, characterId, noteId, title, content, isBeaconRequest } =
    params;

  if (!campaignId && !characterId) {
    throw new Error("Either campaign or character ID must be defined.");
  }

  const noteTable = characterId ? "character_notes" : "campaign_notes";
  const contentTable = characterId
    ? "character_note_content"
    : "campaign_note_content";

  // For beacon requests (page unload), use fetch with keepalive via Supabase REST
  if (isBeaconRequest) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const token = window.sessionStorage.getItem("id-token") ?? supabaseAnonKey;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      Prefer: "resolution=merge-duplicates",
    };

    fetch(`${supabaseUrl}/rest/v1/${noteTable}?id=eq.${noteId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ title }),
      keepalive: true,
    }).catch((e) => console.error(e));

    if (content) {
      const base64Content = btoa(
        String.fromCharCode(...Array.from(content))
      );
      fetch(`${supabaseUrl}/rest/v1/${contentTable}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ note_id: noteId, content: base64Content }),
        keepalive: true,
      }).catch((e) => console.error(e));
    }

    return;
  }

  const { error: titleError } = await supabase
    .from(noteTable)
    .update({ title })
    .eq("id", noteId);

  if (titleError) throw titleError;

  if (content) {
    // Convert Uint8Array to base64 for storage
    const base64Content = btoa(String.fromCharCode(...Array.from(content)));

    const { error: contentError } = await supabase
      .from(contentTable)
      .upsert({ note_id: noteId, content: base64Content });

    if (contentError) throw contentError;
  }
}, "Failed to update note.");
