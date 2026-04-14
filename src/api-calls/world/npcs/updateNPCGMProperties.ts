import { supabase } from "config/supabase.config";
import { GMNPC } from "types/NPCs.type";
import { NPC_PRIVATE_NOTES_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  npcId: string;
  npcGMProperties: Partial<GMNPC>;
}

export const updateNPCGMProperties = createApiFunction<Params, void>(
  async (params) => {
    const { npcId, npcGMProperties } = params;

    // gmNotes is stored separately via updateNPCGMNotes; other fields go into
    // the npc_private_notes.fields JSONB column.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gmNotes, ...fields } = npcGMProperties;

    const { error } = await supabase
      .from(NPC_PRIVATE_NOTES_TABLE)
      .upsert({ npc_id: npcId, fields }, { onConflict: "npc_id" });

    if (error) throw error;
  },
  "Failed to update npc."
);
