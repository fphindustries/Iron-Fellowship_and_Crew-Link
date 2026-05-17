import { CharacterDocument } from "api-calls/character/_character.type";
import { api } from "config/api.config";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export function useListenToCharacter() {
  const { characterId } = useParams();
  const [character, setCharacter] = useState<CharacterDocument>();

  useEffect(() => {
    if (!characterId) return;
    let active = true;

    const fetchCharacter = () => {
      api
        .get<CharacterDocument>(`/api/characters/${characterId}`)
        .then((char) => {
          if (active) setCharacter(char);
        })
        .catch(() => {});
    };

    fetchCharacter();
    const interval = setInterval(fetchCharacter, 10_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [characterId]);

  return { characterId, character };
}
