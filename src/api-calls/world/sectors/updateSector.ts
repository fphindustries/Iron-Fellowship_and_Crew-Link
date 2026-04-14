import { supabase } from "config/supabase.config";
import { convertToDatabase, SECTORS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { Sector } from "types/Sector.type";

interface Params {
  worldId: string;
  sectorId: string;
  sector: Partial<Sector>;
}

export const updateSector = createApiFunction<Params, void>(async (params) => {
  const { sectorId, sector } = params;

  const { error } = await supabase
    .from(SECTORS_TABLE)
    .update(convertToDatabase(sector as any) as any)
    .eq("id", sectorId);

  if (error) throw error;
}, "Failed to update sector.");
