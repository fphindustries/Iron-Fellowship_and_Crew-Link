import { supabase } from "config/supabase.config";
import { GMLore } from "types/Lore.type";
import { LORE_PRIVATE_NOTES_TABLE } from "./_getRef";
import { getErrorMessage } from "functions/getErrorMessage";

export function listenToLoreGMProperties(
  worldId: string,
  loreId: string,
  updateGMProperties: (properties: GMLore | undefined) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    supabase
      .from(LORE_PRIVATE_NOTES_TABLE)
      .select("*")
      .eq("lore_id", loreId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === "PGRST116") {
            updateGMProperties(undefined);
          } else {
            onError(getErrorMessage(error, "Failed to get lore document gm notes"));
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
        updateGMProperties({ gmNotes } as GMLore);
      });
  };

  const channel = supabase
    .channel(`lore_private_notes:${loreId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: LORE_PRIVATE_NOTES_TABLE,
        filter: `lore_id=eq.${loreId}`,
      },
      () => refetch()
    )
    .subscribe();

  refetch();

  return () => {
    supabase.removeChannel(channel);
  };
}
