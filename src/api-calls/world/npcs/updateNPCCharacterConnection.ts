import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { NPCS_TABLE } from "./_getRef";

export const updateNPCCharacterConnection = createApiFunction<
  {
    worldId: string;
    npcId: string;
    characterId: string;
    isConnection: boolean;
  },
  void
>(async (params) => {
  const { npcId, characterId, isConnection } = params;

  // Fetch current data to merge characterConnections
  const { data, error: fetchError } = await supabase
    .from(NPCS_TABLE)
    .select("data")
    .eq("id", npcId)
    .single();

  if (fetchError) throw fetchError;

  const currentData = (data?.data as Record<string, unknown>) ?? {};
  const currentConnections =
    (currentData.characterConnections as Record<string, boolean>) ?? {};
  const updatedConnections = { ...currentConnections, [characterId]: isConnection };

  const { error } = await supabase
    .from(NPCS_TABLE)
    .update({
      data: { ...currentData, characterConnections: updatedConnections },
      updated_at: new Date().toISOString(),
    })
    .eq("id", npcId);

  if (error) throw error;
}, "Error updating npc connection.");
