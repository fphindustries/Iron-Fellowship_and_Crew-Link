import { supabase } from "config/supabase.config";
import { LORE_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const createLore = createApiFunction<
  { worldId: string; shared?: boolean },
  string
>(async (params) => {
  const { worldId } = params;

  const { data, error } = await supabase
    .from(LORE_TABLE)
    .insert({
      world_id: worldId,
      name: "New Lore Document",
      data: { sharedWithPlayers: true },
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}, "Failed to create a new lore document.");
