import { supabase } from "config/supabase.config";
import { SECTORS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  sectorId: string;
}

export const deleteSector = createApiFunction<Params, void>(async (params) => {
  const { sectorId } = params;

  // Deleting the sector cascades to sector_public_notes, sector_private_notes,
  // and sector_locations (via ON DELETE CASCADE in the schema).
  const { error } = await supabase
    .from(SECTORS_TABLE)
    .delete()
    .eq("id", sectorId);

  if (error) throw error;
}, "Failed to delete sector.");
