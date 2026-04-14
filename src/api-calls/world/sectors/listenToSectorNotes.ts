import { supabase } from "config/supabase.config";
import { SECTOR_PUBLIC_NOTES_TABLE, SECTOR_PRIVATE_NOTES_TABLE } from "./_getRef";
import { getErrorMessage } from "functions/getErrorMessage";

export function listenToSectorNotes(
  worldId: string,
  sectorId: string,
  updateNotes: (notes: Uint8Array | undefined) => void,
  onError: (error: string) => void,
  isPrivate?: boolean
): () => void {
  const table = isPrivate ? SECTOR_PRIVATE_NOTES_TABLE : SECTOR_PUBLIC_NOTES_TABLE;
  const filterCol = "sector_id";

  const refetch = () => {
    ;(supabase as any)
      .from(table)
      .select("notes")
      .eq(filterCol, sectorId)
      .single()
      .then(({ data, error }: { data: { notes: string | null } | null; error: { code: string; message: string } | null }) => {
        if (error) {
          if (error.code === "PGRST116") {
            updateNotes(undefined);
          } else {
            onError(getErrorMessage(error, "Failed to get sector notes"));
          }
          return;
        }
        const notes = data?.notes
          ? Uint8Array.from(atob(data.notes), (c) => c.charCodeAt(0))
          : undefined;
        updateNotes(notes);
      });
  };

  const channel = supabase
    .channel(`${table}:${sectorId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `${filterCol}=eq.${sectorId}`,
      },
      () => refetch()
    )
    .subscribe();

  refetch();

  return () => {
    supabase.removeChannel(channel);
  };
}
