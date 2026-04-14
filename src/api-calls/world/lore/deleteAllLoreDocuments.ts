import { supabase } from "config/supabase.config";
import { LORE_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
}

export const deleteAllLoreDocuments = createApiFunction<Params, void>(
  async (params) => {
    const { worldId } = params;

    const { error } = await supabase
      .from(LORE_TABLE)
      .delete()
      .eq("world_id", worldId);

    if (error) throw error;
  },
  "Failed to delete Lore Documents."
);
