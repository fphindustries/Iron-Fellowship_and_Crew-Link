import { supabase } from "config/supabase.config";
import { SECTOR_LOCATIONS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { SectorLocationDocument } from "api-calls/world/sectors/sectorLocations/_sectorLocations.type";

interface Params {
  worldId: string;
  sectorId: string;
  locationId: string;
  location: Partial<SectorLocationDocument>;
}

export const updateSectorLocation = createApiFunction<Params, void>(
  async (params) => {
    const { locationId, location } = params;

    const { error } = await supabase
      .from(SECTOR_LOCATIONS_TABLE)
      .update(location as any)
      .eq("id", locationId);

    if (error) throw error;
  },
  "Failed to update location."
);
