import { useEffect } from "react";
import { getErrorMessage } from "functions/getErrorMessage";
import { useCharactersQuery } from "hooks/queries/useCharactersQuery";
import { useStore } from "stores/store";
import { toCharacterDocument } from "./character.slice";

export function useListenToCharacters() {
  const uid = useStore((store) => store.auth.user?.id);
  const { data: characterRows, isLoading, error } = useCharactersQuery(uid);

  useEffect(() => {
    useStore.setState((store) => {
      store.characters.loading = isLoading;
      store.characters.error = error
        ? getErrorMessage(error, "Failed to load your characters.")
        : undefined;
    });
  }, [error, isLoading]);

  useEffect(() => {
    if (!characterRows || !uid) return;
    useStore.setState((store) => {
      store.characters.characterMap = Object.fromEntries(
        characterRows.map((row) => [row.id, toCharacterDocument(row)])
      );
      store.characters.loading = false;
      store.characters.error = undefined;
    });
  }, [characterRows, uid]);
}
