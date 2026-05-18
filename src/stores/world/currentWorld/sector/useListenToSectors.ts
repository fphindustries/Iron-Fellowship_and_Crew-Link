import { useEffect } from "react";
import { useStore } from "stores/store";
import { useSectorsQuery } from "hooks/queries/useWorldEntitiesQuery";
import { useWorldPermissions } from "components/features/worlds/useWorldPermissions";

export function useListenToSectors() {
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const { data: sectors } = useSectorsQuery(worldId);

  const openSectorId = useStore(
    (store) => store.worlds.currentWorld.currentWorldSectors.openSectorId
  );
  const listenToSectorNotes = useStore(
    (store) => store.worlds.currentWorld.currentWorldSectors.subscribeToSectorNotes
  );
  const resetStoreNotes = useStore(
    (store) => store.worlds.currentWorld.currentWorldSectors.resetStoreNotes
  );
  const { isGuidedGame, showGMFields } = useWorldPermissions();

  useEffect(() => {
    if (!sectors) return;
    useStore.setState((store) => {
      const newMap: typeof store.worlds.currentWorld.currentWorldSectors.sectors = {};
      sectors.forEach(({ id, ...sector }) => {
        newMap[id] = sector;
      });
      store.worlds.currentWorld.currentWorldSectors.sectors = newMap;
    });
  }, [sectors]);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    if (openSectorId) {
      if (showGMFields) {
        unsubscribes.push(listenToSectorNotes(openSectorId, true));
      }
      if (!isGuidedGame) {
        unsubscribes.push(listenToSectorNotes(openSectorId, false));
      }
    }
    return () => {
      unsubscribes.forEach((u) => u());
      resetStoreNotes();
    };
  }, [openSectorId, showGMFields, isGuidedGame, listenToSectorNotes, resetStoreNotes]);
}
