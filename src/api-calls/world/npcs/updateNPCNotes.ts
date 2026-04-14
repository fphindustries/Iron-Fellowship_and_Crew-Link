import { supabase } from "config/supabase.config";
import { NPC_PUBLIC_NOTES_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  worldId: string;
  npcId: string;
  notes: Uint8Array;
  isBeacon?: boolean;
}

export const updateNPCNotes = createApiFunction<Params, void>(
  async (params) => {
    const { npcId, notes, isBeacon } = params;

    const encoded = btoa(String.fromCharCode(...notes));

    if (isBeacon) {
      const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
      const supabaseKey = (supabase as unknown as { supabaseKey: string }).supabaseKey;
      if (notes && supabaseUrl) {
        fetch(
          `${supabaseUrl}/rest/v1/${NPC_PUBLIC_NOTES_TABLE}?npc_id=eq.${npcId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
              apikey: supabaseKey,
              Authorization: `Bearer ${window.sessionStorage.getItem("sb-access-token") ?? supabaseKey}`,
            },
            body: JSON.stringify({ notes: encoded }),
            keepalive: true,
          }
        ).catch((e) => console.error(e));
      }
      return;
    }

    const { error } = await supabase
      .from(NPC_PUBLIC_NOTES_TABLE)
      .upsert({ npc_id: npcId, notes: encoded }, { onConflict: "npc_id" });

    if (error) throw error;
  },
  "Failed to save changes to notes."
);
