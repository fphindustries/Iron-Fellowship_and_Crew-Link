import { supabase } from "config/supabase.config";
import { StoredMove } from "types/Moves.type";

export function listenToCustomMoves(
  uid: string,
  onCustomMoves: (moves: StoredMove[]) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  function fetchAll() {
    Promise.resolve(
      supabase
        .from("user_custom_moves")
        .select("data")
        .eq("user_id", uid)
        .order("updated_at", { ascending: true })
    )
      .then(({ data, error }: { data: unknown; error: unknown }) => {
        if (error) {
          onError(error);
        } else {
          onCustomMoves(
            ((data as { data: unknown }[]) ?? []).map(
              (row) => row.data as unknown as StoredMove
            )
          );
        }
      })
      .catch((error: unknown) => onError(error));
  }

  const channel = supabase
    .channel(`user_custom_moves:${uid}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_custom_moves",
        filter: `user_id=eq.${uid}`,
      },
      () => {
        // Re-fetch all on any change to maintain correct order
        fetchAll();
      }
    )
    .subscribe();

  fetchAll();

  return () => {
    supabase.removeChannel(channel);
  };
}
