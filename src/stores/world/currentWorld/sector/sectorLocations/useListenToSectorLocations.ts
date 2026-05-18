import { useWorldPermissions } from "components/features/worlds/useWorldPermissions";
import { useEffect } from "react";
import { useStore } from "stores/store";
import { useSectorLocationsQuery } from "hooks/queries/useWorldEntitiesQuery";

export function useListenToSectorLocations() {
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const openSectorId = useStore(
    (store) => store.worlds.currentWorld.currentWorldSectors.openSectorId
  );
  const resetStore = useStore(
    (store) => store.worlds.currentWorld.currentWorldSectors.locations.resetStore
  );
  const openSectorLocationId = useStore(
    (store) =>
      store.worlds.currentWorld.currentWorldSectors.locations.openLocationId
  );
  const { isGuidedGame, showGMFields } = useWorldPermissions();
  const subscribeToSectorLocationNotes = useStore(
    (store) =>
      store.worlds.currentWorld.currentWorldSectors.locations
        .subscribeToLocationNotes
  );
  const resetStoreNotes = useStore(
    (store) =>
      store.worlds.currentWorld.currentWorldSectors.locations.resetStoreNotes
  );

  const { data: sectorLocations } = useSectorLocationsQuery(worldId, openSectorId);

  useEffect(() => {
    if (!sectorLocations) return;
    useStore.setState((store) => {
      store.worlds.currentWorld.currentWorldSectors.locations.locations =
        sectorLocations;
    });
  }, [sectorLocations]);

  useEffect(() => {
    return () => {
      resetStore();
    };
  }, [openSectorId, resetStore]);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    if (openSectorLocationId) {
      if (showGMFields) {
        unsubscribes.push(
          subscribeToSectorLocationNotes(openSectorLocationId, true)
        );
      }
      if (isGuidedGame) {
        unsubscribes.push(
          subscribeToSectorLocationNotes(openSectorLocationId, false)
        );
      }
    }
    return () => {
      unsubscribes.forEach((u) => u());
      resetStoreNotes();
    };
  }, [
    openSectorLocationId,
    showGMFields,
    isGuidedGame,
    subscribeToSectorLocationNotes,
    resetStoreNotes,
  ]);
}
