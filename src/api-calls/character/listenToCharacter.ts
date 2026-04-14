import { supabase } from "config/supabase.config";
import { CharacterDocument } from "api-calls/character/_character.type";
import { CHARACTER_TABLE, CharacterRow, rowToCharacterDocument } from "./_getRef";

export function listenToCharacter(
  characterId: string,
  onCharacter: (character: CharacterDocument) => void,
  onError: (error: unknown) => void
): () => void {
  const channel = supabase
    .channel(`character:${characterId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: CHARACTER_TABLE,
        filter: `id=eq.${characterId}`,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new as CharacterRow & { id: string };
        onCharacter(rowToCharacterDocument(row));
      }
    )
    .subscribe();

  supabase
    .from(CHARACTER_TABLE)
    .select("*")
    .eq("id", characterId)
    .single()
    .then(({ data, error }) => {
      if (error) {
        onError(error);
      } else if (data) {
        onCharacter(rowToCharacterDocument(data as CharacterRow & { id: string }));
      } else {
        onError("No character found");
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
