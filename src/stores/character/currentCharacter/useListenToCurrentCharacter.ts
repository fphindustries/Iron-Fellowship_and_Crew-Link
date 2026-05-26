import { useEffect } from "react";
import { useStore } from "stores/store";
import { useCharacterQuery } from "hooks/queries/useCharactersQuery";
import { toCharacterDocument } from "stores/character/character.slice";

export function useListenToCurrentCharacter() {
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const setCurrentCharacterId = useStore(
    (store) => store.characters.currentCharacter.setCurrentCharacterId
  );

  const { data: row } = useCharacterQuery(characterId);

  useEffect(() => {
    if (!row || !characterId) return;
    useStore.setState((store) => {
      store.characters.characterMap[characterId] = toCharacterDocument(row);
    });
    // Re-run setCurrentCharacterId so currentCharacter picks up the fresh data
    setCurrentCharacterId(characterId);
  }, [row, characterId, setCurrentCharacterId]);
}
