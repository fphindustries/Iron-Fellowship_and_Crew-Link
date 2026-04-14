import { supabase } from "config/supabase.config";
import {
  LOCATIONS_TABLE,
  LOCATION_PUBLIC_NOTES_TABLE,
  LOCATION_PRIVATE_NOTES_TABLE,
} from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
}

export const deleteAllLocations = createApiFunction<Params, void>(
  async (params) => {
    const { worldId } = params;

    // Fetch all location ids for this world first
    const { data: locations, error: fetchError } = await supabase
      .from(LOCATIONS_TABLE)
      .select("id")
      .eq("world_id", worldId);

    if (fetchError) throw fetchError;
    if (!locations || locations.length === 0) return;

    const locationIds = locations.map((l) => l.id);

    // Delete notes for all locations in parallel
    await Promise.all([
      supabase.from(LOCATION_PUBLIC_NOTES_TABLE).delete().in("location_id", locationIds),
      supabase.from(LOCATION_PRIVATE_NOTES_TABLE).delete().in("location_id", locationIds),
    ]);

    const { error } = await supabase
      .from(LOCATIONS_TABLE)
      .delete()
      .eq("world_id", worldId);

    if (error) throw error;
  },
  "Failed to delete locations."
);
