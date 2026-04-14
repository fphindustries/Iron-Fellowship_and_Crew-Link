import { supabase } from "config/supabase.config";
import { Lore } from "types/Lore.type";
import { convertToDatabase, LORE_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface LoreParams {
  worldId: string;
  loreId: string;
  lore: Partial<Lore>;
}

export const updateLore = createApiFunction<LoreParams, void>(async (params) => {
  const { loreId, lore } = params;

  const dbUpdate = convertToDatabase(lore);

  const { error } = await supabase
    .from(LORE_TABLE)
    .update(dbUpdate as any)
    .eq("id", loreId);

  if (error) throw error;
}, "Failed to update lore document.");
