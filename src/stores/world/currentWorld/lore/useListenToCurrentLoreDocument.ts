import { useEffect } from "react";
import { useStore } from "stores/store";
import { useLoreDetailQuery } from "hooks/queries/useWorldEntitiesQuery";

export function useListenToCurrentLoreDocument(loreId: string) {
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const isOwner = useStore(
    (store) =>
      store.worlds.currentWorld.currentWorld?.ownerIds?.includes(
        store.auth.uid ?? ""
      ) ?? false
  );

  const { data: detail } = useLoreDetailQuery(worldId, loreId, isOwner);

  useEffect(() => {
    if (!detail) return;
    useStore.setState((store) => {
      const lore = store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
      if (lore) {
        lore.notes = detail.notes;
        lore.gmProperties = detail.gmProperties as never;
      }
    });
  }, [detail, loreId]);
}
