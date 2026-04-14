import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { NPCS_TABLE } from "./_getRef";

export const updateNPCCharacterBond = createApiFunction<
  {
    worldId: string;
    npcId: string;
    characterId: string;
    bonded: boolean;
  },
  void
>(async (params) => {
  const { npcId, characterId, bonded } = params;

  // Fetch current data to merge characterBonds
  const { data, error: fetchError } = await supabase
    .from(NPCS_TABLE)
    .select("data")
    .eq("id", npcId)
    .single();

  if (fetchError) throw fetchError;

  const currentData = (data?.data as Record<string, unknown>) ?? {};
  const currentBonds = (currentData.characterBonds as Record<string, boolean>) ?? {};
  const updatedBonds = { ...currentBonds, [characterId]: bonded };

  const { error } = await supabase
    .from(NPCS_TABLE)
    .update({
      data: { ...currentData, characterBonds: updatedBonds },
      updated_at: new Date().toISOString(),
    })
    .eq("id", npcId);

  if (error) throw error;
}, "Error updating npc bonds.");
