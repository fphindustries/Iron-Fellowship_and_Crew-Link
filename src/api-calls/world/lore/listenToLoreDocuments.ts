import { supabase } from "config/supabase.config";
import { Lore } from "types/Lore.type";
import { constructLoreImagesPath, convertFromDatabase, LORE_TABLE } from "./_getRef";
import { getImageUrl } from "lib/storage.lib";

export function listenToLoreDocuments(
  worldId: string,
  isWorldOwner: boolean,
  updateLore: (loreId: string, lore: Lore) => void,
  updateLoreImage: (loreId: string, imageUrl: string) => void,
  removeLore: (loreId: string) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    let query = supabase
      .from(LORE_TABLE)
      .select("*")
      .eq("world_id", worldId);

    if (!isWorldOwner) {
      query = query.eq("data->>sharedWithPlayers", "true");
    }

    query.then(({ data, error }) => {
      if (error) {
        console.error(error);
        onError("Failed to get lore documents.");
        return;
      }
      if (data) {
        data.forEach((row) => {
          const converted = convertFromDatabase(row as any);
          updateLore(row.id, converted);
          const imageFilenames = converted.imageFilenames;
          if (Array.isArray(imageFilenames) && imageFilenames.length > 0) {
            getImageUrl(
              constructLoreImagesPath(worldId, row.id) + "/" + imageFilenames[0]
            ).then((url) => {
              updateLoreImage(row.id, url);
            });
          }
        });
      }
    });
  };

  const channel = supabase
    .channel(`lore:${worldId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: LORE_TABLE,
        filter: `world_id=eq.${worldId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          removeLore((payload.old as { id: string }).id);
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
