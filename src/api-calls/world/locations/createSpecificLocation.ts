import { supabase } from "config/supabase.config";
import { convertToDatabase, LOCATIONS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { Location } from "types/Locations.type";

export const createSpecificLocation = createApiFunction<
  { worldId: string; location: Location },
  string
>(async (params) => {
  const { worldId, location } = params;
  const dbLocation = convertToDatabase(location);

  const { data, error } = await supabase
    .from(LOCATIONS_TABLE)
    .insert({ ...dbLocation, world_id: worldId } as any)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}, "Failed to create a new location.");
