import { supabase } from "config/supabase.config";
import { SECTOR_LOCATIONS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { SectorLocationDocument } from "api-calls/world/sectors/sectorLocations/_sectorLocations.type";

export const createSectorLocation = createApiFunction<
  {
    worldId: string;
    sectorId: string;
    location: SectorLocationDocument;
  },
  string
>(async (params) => {
  const { sectorId, location } = params;

  const { data, error } = await supabase
    .from(SECTOR_LOCATIONS_TABLE)
    .insert({
      sector_id: sectorId,
      ...location,
    } as any)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}, "Failed to create a new location.");
