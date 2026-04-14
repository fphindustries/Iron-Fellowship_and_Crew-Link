import { supabase } from "config/supabase.config";

export function listenToNoteContent(
  campaignId: string | undefined,
  characterId: string | undefined,
  noteId: string,
  onContent: (content?: Uint8Array) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  if (!characterId && !campaignId) {
    onError("Either campaign or character ID is required.");
    return () => {};
  }

  const table = characterId ? "character_note_content" : "campaign_note_content";
  const channelName = characterId
    ? `character_note_content:${noteId}`
    : `campaign_note_content:${noteId}`;

  async function fetchContent() {
    const { data, error } = await supabase
      .from(table)
      .select("content")
      .eq("note_id", noteId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        onContent(undefined);
      } else {
        onError(error);
      }
      return;
    }

    if (data?.content) {
      // Content is stored as base64 string (BYTEA via PostgREST)
      const binaryString = atob(data.content as string);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      onContent(bytes);
    } else {
      onContent(undefined);
    }
  }

  fetchContent().catch(onError);

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `note_id=eq.${noteId}`,
      },
      () => fetchContent().catch(onError)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
