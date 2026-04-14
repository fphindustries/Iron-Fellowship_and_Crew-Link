import { supabase } from "config/supabase.config";
import {
  NPCS_TABLE,
  NPC_PUBLIC_NOTES_TABLE,
  NPC_PRIVATE_NOTES_TABLE,
} from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
}

export const deleteAllNPCs = createApiFunction<Params, void>(
  async (params) => {
    const { worldId } = params;

    // Fetch all NPC ids for this world
    const { data: npcs, error: fetchError } = await supabase
      .from(NPCS_TABLE)
      .select("id")
      .eq("world_id", worldId);

    if (fetchError) throw fetchError;
    if (!npcs || npcs.length === 0) return;

    const npcIds = npcs.map((n) => n.id);

    // Delete notes for all NPCs in parallel
    await Promise.all([
      supabase.from(NPC_PUBLIC_NOTES_TABLE).delete().in("npc_id", npcIds),
      supabase.from(NPC_PRIVATE_NOTES_TABLE).delete().in("npc_id", npcIds),
    ]);

    const { error } = await supabase
      .from(NPCS_TABLE)
      .delete()
      .eq("world_id", worldId);

    if (error) throw error;
  },
  "Failed to delete npcs."
);
