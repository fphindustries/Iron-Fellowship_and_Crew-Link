import { supabase } from "config/supabase.config";
import { World } from "api-calls/world/_world.type";
import { WORLD_TABLE, decodeWorld } from "./_getRef";

export function listenToWorld(
  worldId: string,
  onDocChange: (data?: World) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  const refetch = () => {
    supabase
      .from(WORLD_TABLE)
      .select("*")
      .eq("id", worldId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (error.code === "PGRST116") {
            // Row not found
            onDocChange(undefined);
          } else {
            onError(error);
          }
          return;
        }
        onDocChange(data ? (decodeWorld(data as any) as World) : undefined);
      });
  };

  const channel = supabase
    .channel(`worlds:${worldId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: WORLD_TABLE,
        filter: `id=eq.${worldId}`,
      },
      () => refetch()
    )
    .subscribe();

  refetch();

  return () => {
    supabase.removeChannel(channel);
  };
}
