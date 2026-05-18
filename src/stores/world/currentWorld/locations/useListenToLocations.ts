import { useEffect } from "react";
import { useStore } from "stores/store";
import { useLocationsQuery } from "hooks/queries/useWorldEntitiesQuery";

export function useListenToLocations() {
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const { data: locations } = useLocationsQuery(worldId);

  useEffect(() => {
    if (!locations) return;
    useStore.setState((store) => {
      const existing = store.worlds.currentWorld.currentWorldLocations.locationMap;
      const newMap: typeof existing = {};
      locations.forEach(({ id, ...loc }) => {
        const prev = existing[id];
        newMap[id] = {
          ...loc,
          gmProperties: prev?.gmProperties,
          notes: prev?.notes,
          imageUrl: prev?.imageUrl,
          mapBackgroundImageUrl: prev?.mapBackgroundImageUrl,
        };
      });
      store.worlds.currentWorld.currentWorldLocations.locationMap = newMap;
    });
  }, [locations]);
}
