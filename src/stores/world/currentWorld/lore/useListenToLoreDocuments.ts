import { useEffect } from "react";
import { useStore } from "stores/store";
import { useLoreQuery } from "hooks/queries/useWorldEntitiesQuery";

export function useListenToLoreDocuments() {
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const { data: loreItems } = useLoreQuery(worldId);

  useEffect(() => {
    if (!loreItems) return;
    useStore.setState((store) => {
      const existing = store.worlds.currentWorld.currentWorldLore.loreMap;
      const newMap: typeof existing = {};
      loreItems.forEach(({ id, ...lore }) => {
        const prev = existing[id];
        newMap[id] = {
          ...lore,
          gmProperties: prev?.gmProperties,
          notes: prev?.notes,
          imageUrl: prev?.imageUrl,
        };
      });
      store.worlds.currentWorld.currentWorldLore.loreMap = newMap;
    });
  }, [loreItems]);
}
