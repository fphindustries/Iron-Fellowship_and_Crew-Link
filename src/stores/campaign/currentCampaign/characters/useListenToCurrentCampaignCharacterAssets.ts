import { useEffect } from "react";
import { useStore } from "stores/store";
import { useCampaignCharacterAssetsQueries } from "hooks/queries/useCampaignsQuery";
import { AssetDocument } from "types/Asset.type";

export function useListenToCurrentCampaignCharacterAssets() {
  const characterIds = useStore(
    (store) =>
      store.campaigns.currentCampaign.currentCampaign?.characters.map(
        (c) => c.characterId
      ) ?? []
  );

  const results = useCampaignCharacterAssetsQueries(characterIds);

  useEffect(() => {
    let hasData = false;
    const updates: Array<{ characterId: string; assets: AssetDocument[] }> = [];
    results.forEach((result, i) => {
      if (result.data) {
        hasData = true;
        updates.push({
          characterId: characterIds[i],
          assets: result.data.map((row) => ({ id: row.id, ...(row.dataJson ?? {}) })),
        });
      }
    });
    if (!hasData) return;
    useStore.setState((store) => {
      updates.forEach(({ characterId, assets }) => {
        store.campaigns.currentCampaign.characters.characterAssets[characterId] = assets;
      });
    });
  }, [results, characterIds]);
}
