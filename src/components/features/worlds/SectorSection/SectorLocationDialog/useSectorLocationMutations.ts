import {
  useDeleteSectorLocationMutation,
  useUpdateSectorLocationMutation,
  useUpdateSectorMutation,
} from "hooks/queries/useWorldEntitiesQuery";
import { useStore } from "stores/store";
import { SectorLocationDocument } from "types/SectorLocations.type";

export function useSectorLocationMutations() {
  const worldId = useStore((store) => store.worlds.currentWorld.currentWorldId);
  const sectorId = useStore(
    (store) => store.worlds.currentWorld.currentWorldSectors.openSectorId
  );
  const sector = useStore((store) =>
    sectorId
      ? store.worlds.currentWorld.currentWorldSectors.sectors[sectorId]
      : undefined
  );
  const locations = useStore(
    (store) => store.worlds.currentWorld.currentWorldSectors.locations.locations
  );

  const updateSector = useUpdateSectorMutation(worldId);
  const updateSectorLocation = useUpdateSectorLocationMutation(
    worldId,
    sectorId
  );
  const deleteSectorLocation = useDeleteSectorLocationMutation(worldId, sectorId);

  const updateLocation = (
    locationId: string,
    patch: Partial<SectorLocationDocument>
  ) => {
    const current = locations[locationId];
    if (!current) return Promise.resolve();
    return updateSectorLocation.mutateAsync({
      locationId,
      dataJson: { ...current, ...patch } as SectorLocationDocument,
    });
  };

  const updateLocationNotes = (
    locationId: string,
    notes: Uint8Array,
    isPrivate?: boolean
  ) =>
    updateLocation(locationId, {
      [isPrivate ? "gmNotes" : "notes"]: Array.from(notes),
    } as Partial<SectorLocationDocument>);

  const deleteLocation = async (locationId: string) => {
    const map = sector?.map;
    if (map && sectorId) {
      const nextMap = JSON.parse(JSON.stringify(map));
      Object.keys(nextMap).forEach((r) => {
        Object.keys(nextMap[Number(r)] ?? {}).forEach((c) => {
          if (nextMap[Number(r)]?.[Number(c)]?.locationId === locationId) {
            delete nextMap[Number(r)][Number(c)];
          }
        });
      });
      await updateSector.mutateAsync({
        sectorId,
        patch: { mapJson: nextMap },
      });
    }
    await deleteSectorLocation.mutateAsync(locationId);
  };

  return {
    updateLocation,
    updateLocationNotes,
    deleteLocation,
  };
}
