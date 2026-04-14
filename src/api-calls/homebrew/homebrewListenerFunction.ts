import { supabase } from "config/supabase.config";

export type HomebrewListenerFunction<T> = (
  homebrewId: string,
  updateData: (data: Record<string, T>) => void,
  onError: (error: unknown) => void
) => () => void;

export function createHomebrewListenerFunction<
  T extends { collectionId: string }
>(
  tableName: string,
  collectionIdColumn: string = "collection_id"
): HomebrewListenerFunction<T> {
  return (homebrewId, updateData, onError) => {
    const refetch = () => {
      supabase
        .from(tableName)
        .select("*")
        .eq(collectionIdColumn, homebrewId)
        .then(({ data, error }) => {
          if (error) {
            console.error(error);
            onError(error);
            return;
          }
          const result: Record<string, T> = {};
          (data ?? []).forEach((row: any) => {
            result[row.id] = row as unknown as T;
          });
          updateData(result);
        });
    };

    refetch();

    const channel = supabase
      .channel(`${tableName}:${homebrewId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
          filter: `${collectionIdColumn}=eq.${homebrewId}`,
        },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };
}
