import { supabase } from "config/supabase.config";
import { CharacterDocument } from "./_character.type";
import { CHARACTER_TABLE, characterDocumentToUpdate } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

interface Params {
  characterId: string;
  character: Partial<CharacterDocument>;
}

export const updateCharacter = createApiFunction<Params, void>(
  async (params) => {
    const { characterId, character } = params;

    const update = characterDocumentToUpdate(character);

    const { error } = await supabase
      .from(CHARACTER_TABLE)
      .update(update)
      .eq("id", characterId);

    if (error) throw error;
  },
  "Failed to update character."
);
