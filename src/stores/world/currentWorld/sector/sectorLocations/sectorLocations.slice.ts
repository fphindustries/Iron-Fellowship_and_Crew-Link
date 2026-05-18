import { CreateSliceType } from "stores/store.type";
import { SectorLocationsSlice } from "./sectorLocations.slice.type";
import { defaultSectorLocationsSlice } from "./sectorLocations.slice.default";
import { api } from "config/api.config";


export const createSectorLocationsSlice: CreateSliceType<
  SectorLocationsSlice
> = (set, getState) => ({
  ...defaultSectorLocationsSlice,

  setOpenLocationId: (sectorLocationId) => {
    set((store) => {
      store.worlds.currentWorld.currentWorldSectors.locations.openLocationId =
        sectorLocationId;
    });
  },

  subscribe: (_worldId, _sectorId) => {
    // Data is now fetched by useSectorLocationsQuery via useListenToSectorLocations.
    return () => {};
  },

  subscribeToLocationNotes: (_locationId, _isPrivate) => {
    // Sector location notes are loaded on-demand — no persistent subscription
    return () => {};
  },

  createLocation: async (location) => {
    const worlds = getState().worlds.currentWorld;
    const worldId = worlds.currentWorldId;
    const sectorId = worlds.currentWorldSectors.openSectorId;
    if (!worldId || !sectorId) return Promise.reject("World ID or Sector ID was not defined");
    const row = await api.post<any>(
      `/api/worlds/${worldId}/sectors/${sectorId}/locations`,
      location
    );
    set((store) => {
      store.worlds.currentWorld.currentWorldSectors.locations.locations[row.id] = location;
    });
    return row.id;
  },

  updateLocation: async (locationId, location) => {
    const worlds = getState().worlds.currentWorld;
    const worldId = worlds.currentWorldId;
    const sectorId = worlds.currentWorldSectors.openSectorId;
    if (!worldId || !sectorId) return Promise.reject("World ID or Sector ID was not defined");
    await api.patch(
      `/api/worlds/${worldId}/sectors/${sectorId}/locations/${locationId}`,
      location
    );
    set((store) => {
      const existing =
        store.worlds.currentWorld.currentWorldSectors.locations.locations[locationId];
      if (existing) {
        store.worlds.currentWorld.currentWorldSectors.locations.locations[locationId] = {
          ...existing,
          ...(location as any),
        };
      }
    });
  },

  deleteLocation: async (locationId) => {
    const worlds = getState().worlds.currentWorld;
    const worldId = worlds.currentWorldId;
    const sectorId = worlds.currentWorldSectors.openSectorId;
    if (!worldId || !sectorId) return Promise.reject("World ID or Sector ID was not defined");

    // Remove hex from map if present
    const map = sectorId ? worlds.currentWorldSectors.sectors[sectorId]?.map : undefined;
    if (map) {
      let foundRow: number | undefined;
      let foundCol: number | undefined;
      Object.keys(map).forEach((r) => {
        Object.keys(map[parseInt(r)] ?? {}).forEach((c) => {
          if (map[parseInt(r)]?.[parseInt(c)]?.locationId === locationId) {
            foundRow = parseInt(r);
            foundCol = parseInt(c);
          }
        });
      });
      if (foundRow !== undefined && foundCol !== undefined) {
        await worlds.currentWorldSectors.updateHex(foundRow, foundCol, undefined).catch(() => {});
      }
    }

    await api.del(`/api/worlds/${worldId}/sectors/${sectorId}/locations/${locationId}`);
    set((store) => {
      delete store.worlds.currentWorld.currentWorldSectors.locations.locations[locationId];
    });
  },

  updateLocationNotes: async (locationId, notes, isPrivate) => {
    const worlds = getState().worlds.currentWorld;
    const worldId = worlds.currentWorldId;
    const sectorId = worlds.currentWorldSectors.openSectorId;
    if (!worldId || !sectorId) return Promise.reject("World ID or Sector ID was not defined");
    await api.patch(
      `/api/worlds/${worldId}/sectors/${sectorId}/locations/${locationId}`,
      { [isPrivate ? "gmNotes" : "notes"]: Array.from(notes) }
    );
    set((store) => {
      store.worlds.currentWorld.currentWorldSectors.locations[
        isPrivate ? "openLocationGMNotes" : "openLocationNotes"
      ] = notes;
    });
  },

  resetStoreNotes: () => {
    set((store) => {
      store.worlds.currentWorld.currentWorldSectors.locations.openLocationNotes = undefined;
      store.worlds.currentWorld.currentWorldSectors.locations.openLocationGMNotes = undefined;
    });
  },

  resetStore: () => {
    set((store) => {
      store.worlds.currentWorld.currentWorldSectors.locations = {
        ...store.worlds.currentWorld.currentWorldSectors.locations,
        ...defaultSectorLocationsSlice,
      };
    });
  },
});
