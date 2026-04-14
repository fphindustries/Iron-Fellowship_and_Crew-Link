import { supabase } from "config/supabase.config";
import { NPC_PUBLIC_NOTES_TABLE } from "./_getRef";
import { getErrorMessage } from "functions/getErrorMessage";

export function listenToNPCNotes(
  worldId: string,
  npcId: string,
  updateNPCNotes: (notes: Uint8Array | undefined) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    supabase
      .from(NPC_PUBLIC_NOTES_TABLE)
      .select("notes")
      .eq("npc_id", npcId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === "PGRST116") {
            updateNPCNotes(undefined);
          } else {
            onError(getErrorMessage(error, "Failed to get npc notes"));
          }
          return;
        }
        const notes = data?.notes
          ? Uint8Array.from(atob(data.notes), (c) => c.charCodeAt(0))
          : undefined;
        updateNPCNotes(notes);
      });
  };

  const channel = supabase
    .channel(`npc_public_notes:${npcId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: NPC_PUBLIC_NOTES_TABLE,
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
