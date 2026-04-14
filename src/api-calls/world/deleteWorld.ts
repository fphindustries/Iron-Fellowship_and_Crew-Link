import { supabase } from "config/supabase.config";
import { CAMPAIGN_TABLE } from "api-calls/campaign/_getRef";
import { CHARACTER_TABLE } from "api-calls/character/_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { WORLD_TABLE } from "./_getRef";
import { deleteAllLocations } from "./locations/deleteAllLocations";
import { deleteAllLoreDocuments } from "./lore/deleteAllLoreDocuments";
import { deleteAllNPCs } from "./npcs/deleteAllNPCs";
import { deleteAllSectors } from "./sectors/deleteAllSectors";

export const deleteWorld = createApiFunction<string, void>(async (worldId) => {
  // Remove world reference from campaigns that use it
  const { error: campaignError } = await supabase
    .from(CAMPAIGN_TABLE)
    .update({ world_id: null })
    .eq("world_id", worldId);

  if (campaignError) throw campaignError;

  // Remove world reference from characters that use it
  const { error: characterError } = await supabase
    .from(CHARACTER_TABLE)
    .update({ world_id: null })
    .eq("world_id", worldId);

  if (characterError) throw characterError;

  await Promise.all([
    deleteAllLocations({ worldId }),
    deleteAllLoreDocuments({ worldId }),
    deleteAllNPCs({ worldId }),
    deleteAllSectors({ worldId }),
  ]);

  const { error: worldError } = await supabase
    .from(WORLD_TABLE)
    .delete()
    .eq("id", worldId);

  if (worldError) throw worldError;
}, "Failed to delete world.");
