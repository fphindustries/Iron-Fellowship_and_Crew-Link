import { supabase } from "config/supabase.config";
import { GMNPC } from "types/NPCs.type";
import { NPC_PRIVATE_NOTES_TABLE } from "./_getRef";
import { getErrorMessage } from "functions/getErrorMessage";

export function listenToNPCGMProperties(
  worldId: string,
  npcId: string,
  updateGMProperties: (properties: GMNPC | undefined) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    supabase
      .from(NPC_PRIVATE_NOTES_TABLE)
      .select("*")
      .eq("npc_id", npcId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === "PGRST116") {
            updateGMProperties(undefined);
          } else {
            onError(getErrorMessage(error, "Failed to get npc gm notes"));
          }
          return;
        }
        if (!data) {
          updateGMProperties(undefined);
          return;
        }
        const gmNotes = data.gm_notes
          ? Uint8Array.from(atob(data.gm_notes), (c) => c.charCodeAt(0))
          : undefined;
        updateGMProperties({
          ...(data.fields as Record<string, unknown> ?? {}),
          gmNotes,
        } as GMNPC);
      });
  };

  const channel = supabase
    .channel(`npc_private_notes:${npcId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: NPC_PRIVATE_NOTES_TABLE,
        filter: `npc_id=eq.${npcId}`,
      },
      () => refetch()
    )
    .subscribe();

  refetch();

  return () => {
    supabase.removeChannel(channel);
  };
}
