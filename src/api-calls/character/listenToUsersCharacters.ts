import { supabase } from "config/supabase.config";
import { CharacterDocument } from "api-calls/character/_character.type";
import { CHARACTER_TABLE, CharacterRow, rowToCharacterDocument } from "./_getRef";

export function listenToUsersCharacters(
  uid: string,
  dataHandler: {
    onDocChange: (id: string, data: CharacterDocument) => void;
    onDocRemove: (id: string) => void;
    onLoaded: () => void;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void
): () => void {
  if (!uid) {
    return () => {};
  }

  const fetchAll = () =>
    supabase
      .from(CHARACTER_TABLE)
      .select("*")
      .eq("uid", uid)
      .then(({ data, error }) => {
        if (error) {
          onError(error);
          return;
        }
        if (data) {
          (data as (CharacterRow & { id: string })[]).forEach((row) =>
            dataHandler.onDocChange(row.id, rowToCharacterDocument(row))
          );
        }
        dataHandler.onLoaded();
      });

  const channel = supabase
    .channel(`characters:uid:${uid}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: CHARACTER_TABLE,
        filter: `uid=eq.${uid}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        if (payload.eventType === "DELETE") {
          dataHandler.onDocRemove((payload.old as { id: string }).id);
        } else {
          const row = payload.new as CharacterRow & { id: string };
          dataHandler.onDocChange(row.id, rowToCharacterDocument(row));
        }
        dataHandler.onLoaded();
      }
    )
    .subscribe();

  fetchAll();

  return () => {
    supabase.removeChannel(channel);
  };
}
