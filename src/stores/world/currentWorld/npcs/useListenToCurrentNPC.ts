import { useEffect } from "react";
import { useStore } from "stores/store";
import { useNPCDetailQuery } from "hooks/queries/useWorldEntitiesQuery";

export function useListenToCurrentNPC(npcId: string) {
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const isOwner = useStore(
    (store) =>
      store.worlds.currentWorld.currentWorld?.ownerIds?.includes(
        store.auth.uid ?? ""
      ) ?? false
  );

  const { data: detail } = useNPCDetailQuery(worldId, npcId, isOwner);

  useEffect(() => {
    if (!detail) return;
    useStore.setState((store) => {
      const npc = store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
      if (npc) {
        npc.notes = detail.notes;
        npc.gmProperties = detail.gmProperties as never;
      }
    });
  }, [detail, npcId]);
}
