import { supabase } from "config/supabase.config";
import { LORE_PUBLIC_NOTES_TABLE } from "./_getRef";
import { getErrorMessage } from "functions/getErrorMessage";

export function listenToLoreNotes(
  worldId: string,
  loreId: string,
  updateLoreNotes: (notes: Uint8Array | undefined) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    supabase
      .from(LORE_PUBLIC_NOTES_TABLE)
      .select("notes")
      .eq("lore_id", loreId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === "PGRST116") {
            updateLoreNotes(undefined);
          } else {
            onError(getErrorMessage(error, "Failed to get lore document notes"));
          }
          return;
        }
        const notes = data?.notes
          ? Uint8Array.from(atob(data.notes), (c) => c.charCodeAt(0))
          : undefined;
        updateLoreNotes(notes);
      });
  };

  const channel = supabase
    .channel(`lore_public_notes:${loreId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: LORE_PUBLIC_NOTES_TABLE,
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
