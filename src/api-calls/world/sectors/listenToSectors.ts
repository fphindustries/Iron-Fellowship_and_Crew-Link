import { supabase } from "config/supabase.config";
import { convertFromDatabase, SECTORS_TABLE } from "./_getRef";
import { Sector } from "types/Sector.type";

export function listenToSectors(
  worldId: string,
  isWorldOwner: boolean,
  updateSector: (sectorId: string, sector: Sector) => void,
  removeSector: (sectorId: string) => void,
  onError: (error: string) => void
): () => void {
  const refetch = () => {
    let query = supabase
      .from(SECTORS_TABLE)
      .select("*")
      .eq("world_id", worldId);

    if (!isWorldOwner) {
      query = query.eq("shared_with_players", true);
    }

    query.then(({ data, error }) => {
      if (error) {
        console.error(error);
        onError("Failed to get sectors");
        return;
      }
      if (data) {
        data.forEach((row) => {
          updateSector(row.id, convertFromDatabase(row as any));
        });
      }
    });
  };

  const channel = supabase
    .channel(`sectors:${worldId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: SECTORS_TABLE,
        filter: `world_id=eq.${worldId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          removeSector((payload.old as { id: string }).id);
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
