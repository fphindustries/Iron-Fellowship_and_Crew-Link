import { useEffect } from "react";
import { useStore } from "stores/store";
import { useCampaignCharactersQueries } from "hooks/queries/useCampaignsQuery";
import { toCharacterDocument } from "stores/character/character.slice";

export function useListenToCurrentCampaignCharacters() {
  const characterIds = useStore(
    (store) =>
      store.campaigns.currentCampaign.currentCampaign?.characters.map(
        (c) => c.characterId
      ) ?? []
  );

  const results = useCampaignCharactersQueries(characterIds);

  useEffect(() => {
    const newMap: Record<string, unknown> = {};
    let hasData = false;
    results.forEach((result, i) => {
      if (result.data) {
        newMap[characterIds[i]] = toCharacterDocument(result.data);
        hasData = true;
      }
    });
    if (!hasData) return;
    useStore.setState((store) => {
      Object.assign(store.campaigns.currentCampaign.characters.characterMap, newMap);
    });
  }, [results, characterIds]);
}
