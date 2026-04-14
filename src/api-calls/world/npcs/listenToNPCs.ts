import { supabase } from "config/supabase.config";
import { NPC } from "types/NPCs.type";
import { constructNPCImagesPath, convertFromDatabase, NPCS_TABLE } from "./_getRef";
import { getImageUrl } from "lib/storage.lib";

export function listenToNPCs(
  worldId: string,
  isWorldOwner: boolean,
  updateNPC: (npcId: string, npc: NPC) => void,
  updateNPCImage: (npcId: string, imageUrl: string) => void,
  removeNPC: (npcId: string) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    let query = supabase
      .from(NPCS_TABLE)
      .select("*")
      .eq("world_id", worldId);

    if (!isWorldOwner) {
      query = query.eq("data->>sharedWithPlayers", "true");
    }

    query.then(({ data, error }) => {
      if (error) {
        console.error(error);
        onError("Failed to get npcs");
        return;
      }
      if (data) {
        data.forEach((row) => {
          const converted = convertFromDatabase(row as any);
          updateNPC(row.id, converted);
          const imageFilenames = converted.imageFilenames;
          if (Array.isArray(imageFilenames) && imageFilenames.length > 0) {
            getImageUrl(
              constructNPCImagesPath(worldId, row.id) + "/" + imageFilenames[0]
            ).then((url) => {
              updateNPCImage(row.id, url);
            });
          }
        });
      }
    });
  };

  const channel = supabase
    .channel(`npcs:${worldId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: NPCS_TABLE,
        filter: `world_id=eq.${worldId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          removeNPC((payload.old as { id: string }).id);
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
