import { supabase } from "config/supabase.config";
import { SECTORS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const createSector = createApiFunction<
  { worldId: string; shared?: boolean },
  string
>(async (params) => {
  const { worldId } = params;

  const { data, error } = await supabase
    .from(SECTORS_TABLE)
    .insert({
      world_id: worldId,
      name: "New Sector",
      map: {},
      shared_with_players: true,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}, "Failed to create a new sector.");
