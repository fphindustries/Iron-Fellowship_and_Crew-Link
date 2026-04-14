import { supabase } from "config/supabase.config";
import { World } from "api-calls/world/_world.type";
import { WORLD_TABLE, decodeWorld } from "./_getRef";

export function listenToUsersWorlds(
  uid: string,
  dataHandler: {
    onDocChange: (id: string, data: World) => void;
    onDocRemove: (id: string) => void;
    onLoaded: () => void;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  const refetch = () => {
    supabase
      .from(WORLD_TABLE)
      .select("*")
      .or(`owner_ids.cs.{"${uid}"},campaign_guides.cs.{"${uid}"}`)
      .then(({ data, error }) => {
        if (error) {
          onError(error);
          return;
        }
        if (data) {
          data.forEach((row) => {
            dataHandler.onDocChange(row.id, decodeWorld(row as any) as World);
          });
        }
        dataHandler.onLoaded();
      });
  };

  const channel = supabase
    .channel(`worlds:user:${uid}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: WORLD_TABLE },
      () => refetch()
    )
    .subscribe();

  refetch();

  return () => {
    supabase.removeChannel(channel);
  };
}
