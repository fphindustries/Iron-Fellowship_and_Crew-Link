import { supabase } from "config/supabase.config";
import { NPC } from "types/NPCs.type";
import { convertToDatabase, NPCS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface NPCParams {
  worldId: string;
  npcId: string;
  npc: Partial<NPC>;
}

export const updateNPC = createApiFunction<NPCParams, void>(async (params) => {
  const { npcId, npc } = params;

  const dbUpdate = convertToDatabase(npc);

  const { error } = await supabase
    .from(NPCS_TABLE)
    .update(dbUpdate as any)
    .eq("id", npcId);

  if (error) throw error;
}, "Failed to update npc.");
