import { supabase } from "config/supabase.config";
import { NPCS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { NPC } from "types/NPCs.type";

export const createNPC = createApiFunction<
  { worldId: string; npc?: Partial<NPC> },
  string
>(async (params) => {
  const { worldId, npc } = params;

  const { name, pronouns, createdDate, updatedDate, ...restNpc } = npc ?? {};

  const { data, error } = await supabase
    .from(NPCS_TABLE)
    .insert({
      world_id: worldId,
      name: name ?? "New NPC",
      pronouns: pronouns ?? null,
      data: { sharedWithPlayers: true, ...restNpc },
      created_at: createdDate?.toISOString() ?? new Date().toISOString(),
      updated_at: updatedDate?.toISOString() ?? new Date().toISOString(),
    } as any)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}, "Failed to create a new npc.");
