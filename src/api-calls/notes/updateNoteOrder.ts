import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateNoteOrder = createApiFunction<
  {
    campaignId?: string;
    characterId?: string;
    noteId: string;
    order: number;
  },
  void
>(async (params) => {
  const { campaignId, characterId, noteId, order } = params;

  if (!characterId && !campaignId) {
    throw new Error("Either campaign or character ID must be defined.");
  }

  const table = characterId ? "character_notes" : "campaign_notes";

  const { error } = await supabase
    .from(table)
    .update({ order })
    .eq("id", noteId);

  if (error) throw error;
}, "Failed to reorder note.");
