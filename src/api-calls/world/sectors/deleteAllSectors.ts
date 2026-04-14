import { supabase } from "config/supabase.config";
import { SECTORS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
}

export const deleteAllSectors = createApiFunction<Params, void>(
  async (params) => {
    const { worldId } = params;

    // Cascades to notes and sector_locations via ON DELETE CASCADE.
    const { error } = await supabase
      .from(SECTORS_TABLE)
      .delete()
      .eq("world_id", worldId);

    if (error) throw error;
  },
  "Failed to delete sectors."
);
