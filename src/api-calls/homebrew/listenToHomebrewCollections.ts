import { supabase } from "config/supabase.config";
import { HomebrewCollectionDocument } from "api-calls/homebrew/_homebrewCollection.type";
import { HOMEBREW_COLLECTION_TABLE } from "./_getRef";

export function listenToHomebrewCollections(
  uid: string,
  updateCollection: (
    collectionId: string,
    collection: HomebrewCollectionDocument
  ) => void,
  removeCollection: (collectionId: string) => void,
  onError: (error: unknown) => void,
  onLoaded: () => void
): () => void {
  const fetchCollections = () => {
    supabase
      .from(HOMEBREW_COLLECTION_TABLE)
      .select("*")
      .or(`editors.cs.{"${uid}"},viewers.cs.{"${uid}"}`)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          onError(error);
          return;
        }
        const rows = data ?? [];
        rows.forEach((row) => {
          updateCollection(
            row.id,
            row as unknown as HomebrewCollectionDocument
          );
        });
        onLoaded();
      });
  };

  fetchCollections();

  const channel = supabase
    .channel(`homebrew_collections:${uid}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: HOMEBREW_COLLECTION_TABLE,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          removeCollection((payload.old as any).id);
        } else {
          const row = payload.new as any;
          const editors: string[] = row.editors ?? [];
          const viewers: string[] = row.viewers ?? [];
          if (editors.includes(uid) || viewers.includes(uid)) {
            updateCollection(row.id, row as unknown as HomebrewCollectionDocument);
          } else {
            // User no longer has access
            removeCollection(row.id);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
