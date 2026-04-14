import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateNoteShared = createApiFunction<
  {
    campaignId: string | undefined;
    characterId: string | undefined;
    noteId: string;
    shared: boolean;
  },
  void
>(async (params) => {
  const { campaignId, characterId, noteId, shared } = params;

  if (!campaignId && !characterId) {
    throw new Error("Either campaign or character ID must be defined.");
  }

  const table = characterId ? "character_notes" : "campaign_notes";

  const { error } = await supabase
    .from(table)
    .update({ shared })
    .eq("id", noteId);

  if (error) throw error;
}, "Failed to update note.");
