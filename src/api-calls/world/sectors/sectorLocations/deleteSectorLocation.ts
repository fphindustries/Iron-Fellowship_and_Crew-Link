import { supabase } from "config/supabase.config";
import { SECTOR_LOCATIONS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  sectorId: string;
  locationId: string;
}

export const deleteSectorLocation = createApiFunction<Params, void>(
  async (params) => {
    const { locationId } = params;

    // ON DELETE CASCADE handles sector_location_public_notes and
    // sector_location_private_notes automatically.
    const { error } = await supabase
      .from(SECTOR_LOCATIONS_TABLE)
      .delete()
      .eq("id", locationId);

    if (error) throw error;
  },
  "Failed to delete location."
);
