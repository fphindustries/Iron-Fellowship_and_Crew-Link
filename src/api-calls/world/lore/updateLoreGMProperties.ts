import { supabase } from "config/supabase.config";
import { GMLore } from "types/Lore.type";
import { LORE_PRIVATE_NOTES_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  loreId: string;
  loreGMProperties: Partial<GMLore>;
}

export const updateLoreGMProperties = createApiFunction<Params, void>(
  async (params) => {
    const { loreId, loreGMProperties } = params;

    // gmNotes is stored separately via updateLoreGMNotes; other fields go into
    // the lore_private_notes.fields JSONB column.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gmNotes, ...fields } = loreGMProperties;

    const { error } = await supabase
      .from(LORE_PRIVATE_NOTES_TABLE)
      .upsert({ lore_id: loreId, fields }, { onConflict: "lore_id" });

    if (error) throw error;
  },
  "Failed to update lore document."
);
