import { supabase } from "config/supabase.config";
import {
  SECTOR_LOCATION_PUBLIC_NOTES_TABLE,
  SECTOR_LOCATION_PRIVATE_NOTES_TABLE,
} from "./_getRef";
import { getErrorMessage } from "functions/getErrorMessage";

export function listenToSectorLocationNotes(
  worldId: string,
  sectorId: string,
  locationId: string,
  updateNotes: (notes: Uint8Array | undefined) => void,
  onError: (error: string) => void,
  isPrivate?: boolean
): () => void {
  const table = isPrivate
    ? SECTOR_LOCATION_PRIVATE_NOTES_TABLE
    : SECTOR_LOCATION_PUBLIC_NOTES_TABLE;

  const refetch = () => {
    ;(supabase as any)
      .from(table)
      .select("notes")
      .eq("sector_location_id", locationId)
      .single()
      .then(({ data, error }: { data: { notes: string | null } | null; error: { code: string; message: string } | null }) => {
        if (error) {
          if (error.code === "PGRST116") {
            updateNotes(undefined);
          } else {
            onError(getErrorMessage(error, "Failed to get location notes"));
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
    .channel(`${table}:${locationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `sector_location_id=eq.${locationId}`,
      },
      () => refetch()
    )
    .subscribe();

  refetch();

  return () => {
    supabase.removeChannel(channel);
  };
}
