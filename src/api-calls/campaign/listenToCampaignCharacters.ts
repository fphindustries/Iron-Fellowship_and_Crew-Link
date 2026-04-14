import { supabase } from "config/supabase.config";
import { CharacterDocument } from "api-calls/character/_character.type";
import { CHARACTER_TABLE } from "../character/_getRef";

interface Params {
  characterIdList: string[];
  onDocChange: (id: string, character?: CharacterDocument) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (error: any) => void;
}

export function listenToCampaignCharacters(params: Params): (() => void)[] {
  const { characterIdList, onDocChange, onError } = params;

  const unsubscribes = (characterIdList || []).map((characterId) => {
    // Initial fetch
    supabase
      .from(CHARACTER_TABLE)
      .select("*")
      .eq("id", characterId)
      .single()
      .then((result: { data: unknown; error: unknown }) => {
        if (result.error) {
          console.error(result.error);
          onError(new Error("Failed to fetch characters."));
          return;
        }
        onDocChange(characterId, result.data as CharacterDocument);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`characters:${characterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: CHARACTER_TABLE,
          filter: `id=eq.${characterId}`,
        },
        (payload: { eventType: string; new: unknown }) => {
          if (payload.eventType === "DELETE") {
            onDocChange(characterId, undefined);
          } else {
            onDocChange(characterId, payload.new as CharacterDocument);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  });

  return unsubscribes;
}
