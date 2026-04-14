import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const removeNote = createApiFunction<
  {
    characterId?: string;
    campaignId?: string;
    noteId: string;
  },
  void
>(async (params) => {
  const { campaignId, characterId, noteId } = params;

  if (!campaignId && !characterId) {
    throw new Error("Either character or campaign ID must be defined.");
  }

  if (characterId) {
    // Delete content first (FK constraint), then note
    await supabase
      .from("character_note_content")
      .delete()
      .eq("note_id", noteId);

    const { error } = await supabase
      .from("character_notes")
      .delete()
      .eq("id", noteId);

    if (error) throw error;
  } else {
    // Delete content first (FK constraint), then note
    await supabase
      .from("campaign_note_content")
      .delete()
      .eq("note_id", noteId);

    const { error } = await supabase
      .from("campaign_notes")
      .delete()
      .eq("id", noteId);

    if (error) throw error;
  }
}, "Failed to remove note.");
