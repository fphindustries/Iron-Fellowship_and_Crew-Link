import { supabase } from "config/supabase.config";
import { SECTOR_LOCATIONS_TABLE } from "./_getRef";
import { SectorLocationDocument } from "api-calls/world/sectors/sectorLocations/_sectorLocations.type";

export function listenToSectorLocations(
  worldId: string,
  sectorId: string,
  updateSectorLocation: (
    locationId: string,
    location: SectorLocationDocument
  ) => void,
  removeSectorLocation: (locationId: string) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    supabase
      .from(SECTOR_LOCATIONS_TABLE)
      .select("*")
      .eq("sector_id", sectorId)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          onError("Failed to get locations");
          return;
        }
        if (data) {
          data.forEach((row) => {
            // Strip the DB-only columns; the rest matches SectorLocationDocument
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, sector_id, created_at, updated_at, ...location } = row;
            updateSectorLocation(id, location as unknown as SectorLocationDocument);
          });
        }
      });
  };

  const channel = supabase
    .channel(`sector_locations:${sectorId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: SECTOR_LOCATIONS_TABLE,
        filter: `sector_id=eq.${sectorId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          removeSectorLocation((payload.old as { id: string }).id);
        } else {
          refetch();
        }
      }
    )
    .subscribe();

  refetch();

  return () => {
    supabase.removeChannel(channel);
  };
}
