import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { NPCS_TABLE } from "./_getRef";

export const updateNPCCharacterBondProgress = createApiFunction<
  {
    worldId: string;
    npcId: string;
    characterId: string;
    progress: number;
  },
  void
>(async (params) => {
  const { npcId, characterId, progress } = params;

  // Fetch current data JSONB, merge the new bond progress entry, then write back
  const { data: existing, error: fetchError } = await supabase
    .from(NPCS_TABLE)
    .select("data")
    .eq("id", npcId)
    .single();

  if (fetchError) throw fetchError;

  const currentData = (existing?.data ?? {}) as Record<string, unknown>;
  const characterBondProgress = {
    ...((currentData.characterBondProgress as Record<string, number>) ?? {}),
    [characterId]: progress,
  };

  const { error } = await supabase
    .from(NPCS_TABLE)
    .update({
      data: { ...currentData, characterBondProgress },
      updated_at: new Date().toISOString(),
    })
    .eq("id", npcId);

  if (error) throw error;
}, "Error updating npc bond progress.");
