import { supabase } from "config/supabase.config";
import { GMLocation } from "types/Locations.type";
import { LOCATION_PRIVATE_NOTES_TABLE } from "./_getRef";
import { getErrorMessage } from "functions/getErrorMessage";

export function listenToLocationGMProperties(
  worldId: string,
  locationId: string,
  updateGMProperties: (properties: GMLocation | undefined) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    supabase
      .from(LOCATION_PRIVATE_NOTES_TABLE)
      .select("*")
      .eq("location_id", locationId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === "PGRST116") {
            updateGMProperties(undefined);
          } else {
            onError(getErrorMessage(error, "Failed to get location gm notes"));
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
        } as GMLocation);
      });
  };

  const channel = supabase
    .channel(`location_private_notes:${locationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: LOCATION_PRIVATE_NOTES_TABLE,
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
