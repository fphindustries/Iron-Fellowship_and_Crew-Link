import { CreateSliceType } from "stores/store.type";
import { CurrentWorldSlice } from "./currentWorld.slice.type";
import { defaultCurrentWorldSlice } from "./currentWorld.default.type";
import { createLocationsSlice } from "./locations/locations.slice";
import { createNPCsSlice } from "./npcs/npcs.slice";
import { createLoreSlice } from "./lore/lore.slice";
import { createSectorSlice } from "./sector/sector.slice";
import { api } from "config/api.config";

export const createCurrentWorldSlice: CreateSliceType<CurrentWorldSlice> = (
  ...params
) => {
  const [set, getState] = params;
  return {
    ...defaultCurrentWorldSlice,
    currentWorldLocations: createLocationsSlice(...params),
    currentWorldNPCs: createNPCsSlice(...params),
    currentWorldLore: createLoreSlice(...params),
    currentWorldSectors: createSectorSlice(...params),
    setCurrentWorldId: (worldId) => {
      const store = getState();
      const previousWorldId = store.worlds.currentWorld.currentWorldId;
      if (worldId && worldId !== previousWorldId) {
        store.worlds.currentWorld.resetStore();
        set((store) => {
          store.worlds.currentWorld.currentWorldId = worldId;
        });
      } else if (previousWorldId !== worldId) {
        store.worlds.currentWorld.resetStore();
      }
    },
    setCurrentWorld: (world) => {
      set((store) => {
        store.worlds.currentWorld.currentWorld = world;
      });
    },
    updateCurrentWorld: async (partialWorld) => {
      const worldId = getState().worlds.currentWorld.currentWorldId;
      if (!worldId) return Promise.reject("No world id defined.");
      await api.patch(`/api/worlds/${worldId}`, partialWorld);
    },
    updateCurrentWorldDescription: async (worldId, description) => {
      await api.patch(`/api/worlds/${worldId}`, { worldDescription: description });
    },
    updateCurrentWorldTruth: async (truthKey, truth) => {
      const worldId = getState().worlds.currentWorld.currentWorldId;
      if (!worldId) return Promise.reject("No world id defined.");
      const current = getState().worlds.currentWorld.currentWorld;
      const newTruths = { ...(current?.newTruths ?? {}), [truthKey]: truth };
      await api.patch(`/api/worlds/${worldId}`, { newTruths });
    },

    resetStore: () => {
      const state = getState();
      state.worlds.currentWorld.currentWorldLocations.resetStore();
      state.worlds.currentWorld.currentWorldNPCs.resetStore();
      state.worlds.currentWorld.currentWorldLore.resetStore();
      state.worlds.currentWorld.currentWorldSectors.resetStore();
      set((store) => {
        store.worlds.currentWorld = {
          ...store.worlds.currentWorld,
          ...defaultCurrentWorldSlice,
        };
      });
    },
  };
};
