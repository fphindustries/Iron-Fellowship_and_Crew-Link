import { useEffect } from "react";
import { useStore } from "stores/store";
import {
  useLocationDetailQuery,
} from "hooks/queries/useWorldEntitiesQuery";
import { getImageUrl } from "lib/storage.lib";

export function useListenToCurrentLocation(locationId: string) {
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const isOwner = useStore(
    (store) =>
      store.worlds.currentWorld.currentWorld?.ownerIds?.includes(
        store.auth.uid ?? ""
      ) ?? false
  );
  const mapBgFilename = useStore(
    (store) =>
      store.worlds.currentWorld.currentWorldLocations.locationMap[locationId]
        ?.mapBackgroundImageFilename
  );

  const { data: detail } = useLocationDetailQuery(worldId, locationId, isOwner);

  useEffect(() => {
    if (!detail) return;
    useStore.setState((store) => {
      const loc =
        store.worlds.currentWorld.currentWorldLocations.locationMap[locationId];
      if (loc) {
        loc.notes = detail.notes;
        loc.gmProperties = detail.gmProperties as never;
      }
    });
  }, [detail, locationId]);

  useEffect(() => {
    if (!worldId || !mapBgFilename) {
      useStore.setState((store) => {
        const loc =
          store.worlds.currentWorld.currentWorldLocations.locationMap[
            locationId
          ];
        if (loc) loc.mapBackgroundImageUrl = undefined;
      });
      return;
    }
    getImageUrl(
      `/worlds/${worldId}/locations/${locationId}/${mapBgFilename}`
    )
      .then((url) => {
        useStore.setState((store) => {
          const loc =
            store.worlds.currentWorld.currentWorldLocations.locationMap[
              locationId
            ];
          if (loc) loc.mapBackgroundImageUrl = url;
        });
      })
      .catch(() => {});
  }, [worldId, locationId, mapBgFilename]);
}
