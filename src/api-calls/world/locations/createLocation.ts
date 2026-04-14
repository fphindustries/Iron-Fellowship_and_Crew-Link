import { supabase } from "config/supabase.config";
import { LOCATIONS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const createLocation = createApiFunction<
  { worldId: string; shared?: boolean },
  string
>(async (params) => {
  const { worldId } = params;

  const { data, error } = await supabase
    .from(LOCATIONS_TABLE)
    .insert({
      world_id: worldId,
      name: "New Location",
      data: { sharedWithPlayers: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}, "Failed to create a new location.");
