import { supabase } from "config/supabase.config";
import { Location } from "types/Locations.type";
import { constructLocationImagesPath, convertFromDatabase, LOCATIONS_TABLE } from "./_getRef";
import { getImageUrl } from "lib/storage.lib";

export function listenToLocations(
  worldId: string,
  isWorldOwner: boolean,
  updateLocation: (locationId: string, location: Location) => void,
  updateLocationImage: (locationId: string, imageUrl: string) => void,
  removeLocation: (locationId: string) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    let query = supabase
      .from(LOCATIONS_TABLE)
      .select("*")
      .eq("world_id", worldId);

    if (!isWorldOwner) {
      query = query.eq("data->>sharedWithPlayers", "true");
    }

    query.then(({ data, error }) => {
      if (error) {
        console.error(error);
        onError("Failed to get locations");
        return;
      }
      if (data) {
        data.forEach((row) => {
          const converted = convertFromDatabase(row as any);
          updateLocation(row.id, converted);
          const imageFilenames = converted.imageFilenames;
          if (Array.isArray(imageFilenames) && imageFilenames.length > 0) {
            getImageUrl(
              constructLocationImagesPath(worldId, row.id) + "/" + imageFilenames[0]
            ).then((url) => {
              updateLocationImage(row.id, url);
            });
          }
        });
      }
    });
  };

  const channel = supabase
    .channel(`locations:${worldId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: LOCATIONS_TABLE,
        filter: `world_id=eq.${worldId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          removeLocation((payload.old as { id: string }).id);
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
