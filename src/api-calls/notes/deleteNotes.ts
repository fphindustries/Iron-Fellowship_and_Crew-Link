import { supabase } from "config/supabase.config";
import { removeNote } from "./removeNote";
import { createApiFunction } from "api-calls/createApiFunction";

async function getAllNoteIds(
  campaignId: string | undefined,
  characterId: string | undefined
): Promise<string[]> {
  if (!characterId && !campaignId) {
    throw new Error("Either character or campaign ID must be defined.");
  }

  if (characterId) {
    const { data, error } = await supabase
      .from("character_notes")
      .select("id")
      .eq("character_id", characterId);

    if (error) throw error;
    return (data ?? []).map((row: { id: string }) => row.id);
  } else {
    const { data, error } = await supabase
      .from("campaign_notes")
      .select("id")
      .eq("campaign_id", campaignId as string);

    if (error) throw error;
    return (data ?? []).map((row: { id: string }) => row.id);
  }
}

export const deleteNotes = createApiFunction<
  { characterId?: string; campaignId?: string },
  void
>(async ({ campaignId, characterId }) => {
  if (!campaignId && !characterId) {
    throw new Error("Either campaign or character ID must be defined.");
  }

  const noteIds = await getAllNoteIds(campaignId, characterId);
  await Promise.all(
    noteIds.map((noteId) => removeNote({ campaignId, characterId, noteId }))
  );
}, "Failed to delete some or all notes.");
