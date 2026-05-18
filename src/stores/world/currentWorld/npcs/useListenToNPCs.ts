import { useEffect } from "react";
import { useStore } from "stores/store";
import { useNPCsQuery } from "hooks/queries/useWorldEntitiesQuery";

export function useListenToNPCs() {
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const { data: npcs } = useNPCsQuery(worldId);

  useEffect(() => {
    if (!npcs) return;
    useStore.setState((store) => {
      const existing = store.worlds.currentWorld.currentWorldNPCs.npcMap;
      const newMap: typeof existing = {};
      npcs.forEach(({ id, ...npc }) => {
        const prev = existing[id];
        newMap[id] = {
          ...npc,
          gmProperties: prev?.gmProperties,
          notes: prev?.notes,
          imageUrl: prev?.imageUrl,
        };
      });
      store.worlds.currentWorld.currentWorldNPCs.npcMap = newMap;
    });
  }, [npcs]);
}
