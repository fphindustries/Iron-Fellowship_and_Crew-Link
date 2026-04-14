import { supabase } from "config/supabase.config";
import { SECTOR_LOCATIONS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  sectorId: string;
}

export const deleteAllSectorLocations = createApiFunction<Params, void>(
  async (params) => {
    const { sectorId } = params;

    // ON DELETE CASCADE handles notes sub-tables automatically.
    const { error } = await supabase
      .from(SECTOR_LOCATIONS_TABLE)
      .delete()
      .eq("sector_id", sectorId);

    if (error) throw error;
  },
  "Failed to delete locations."
);
