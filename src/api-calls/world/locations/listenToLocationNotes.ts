import { supabase } from "config/supabase.config";
import { LOCATION_PUBLIC_NOTES_TABLE } from "./_getRef";
import { getErrorMessage } from "functions/getErrorMessage";

export function listenToLocationNotes(
  worldId: string,
  locationId: string,
  updateLocationNotes: (notes: Uint8Array | undefined) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    supabase
      .from(LOCATION_PUBLIC_NOTES_TABLE)
      .select("notes")
      .eq("location_id", locationId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === "PGRST116") {
            updateLocationNotes(undefined);
          } else {
            onError(getErrorMessage(error, "Failed to get location notes"));
          }
          return;
        }
        const notes = data?.notes
          ? Uint8Array.from(atob(data.notes), (c) => c.charCodeAt(0))
          : undefined;
        updateLocationNotes(notes);
      });
  };

  const channel = supabase
    .channel(`location_public_notes:${locationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: LOCATION_PUBLIC_NOTES_TABLE,
        filter: `location_id=eq.${locationId}`,
      },
      () => refetch()
    )
    .subscribe();

  refetch();

  return () => {
    supabase.removeChannel(channel);
  };
}
