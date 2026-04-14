import { supabase } from "config/supabase.config";
import { HomebrewCollectionDocument } from "api-calls/homebrew/_homebrewCollection.type";
import { HOMEBREW_COLLECTION_TABLE } from "./_getRef";

export function listenToHomebrewCollection(
  collectionId: string,
  updateCollection: (collection: HomebrewCollectionDocument) => void,
  onError: (error: unknown) => void,
  onLoaded: () => void
): () => void {
  const channel = supabase
    .channel(`homebrew_collection:${collectionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: HOMEBREW_COLLECTION_TABLE,
        filter: `id=eq.${collectionId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") return;
        updateCollection(payload.new as unknown as HomebrewCollectionDocument);
      }
    )
    .subscribe();

  supabase
    .from(HOMEBREW_COLLECTION_TABLE)
    .select("*")
    .eq("id", collectionId)
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error(error);
        onError(error);
      } else if (data) {
        updateCollection(data as unknown as HomebrewCollectionDocument);
      } else {
        onLoaded();
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
