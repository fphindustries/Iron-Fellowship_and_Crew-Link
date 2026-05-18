import { useEffect } from "react";
import { useStore } from "stores/store";
import { useCharacterAssetsQuery } from "hooks/queries/useCharactersQuery";
import { AssetDocument } from "types/Asset.type";

export function useListenToCurrentCharacterAssets() {
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const { data: assetRows } = useCharacterAssetsQuery(characterId);

  useEffect(() => {
    if (!assetRows) return;
    const assets: Record<string, AssetDocument> = {};
    assetRows.forEach((row) => {
      assets[row.id] = { id: row.id, ...(row.dataJson ?? {}) };
    });
    useStore.setState((store) => {
      store.characters.currentCharacter.assets.assets = assets;
      store.characters.currentCharacter.assets.loading = false;
    });
  }, [assetRows]);
}
