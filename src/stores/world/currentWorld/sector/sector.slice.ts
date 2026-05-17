import { CreateSliceType } from "stores/store.type";
import { SectorSlice } from "./sector.slice.type";
import { defaultSectorSlice } from "./sector.slice.default";
import { createSectorLocationsSlice } from "./sectorLocations/sectorLocations.slice";
import { api } from "config/api.config";
import { Sector } from "types/Sector.type";

function toSector(row: any): Sector {
  return {
    name: row.name,
    sharedWithPlayers: row.sharedWithPlayers ?? false,
    region: row.region ?? undefined,
    trouble: row.trouble ?? undefined,
    map: row.mapJson ?? {},
    createdDate: row.createdAt ? new Date(row.createdAt) : new Date(),
  };
}

export const createSectorSlice: CreateSliceType<SectorSlice> = (...params) => {
  const [set, getState] = params;
  return {
    locations: createSectorLocationsSlice(...params),
    ...defaultSectorSlice,

    setOpenSectorId: (sectorId) => {
      set((store) => {
        store.worlds.currentWorld.currentWorldSectors.openSectorId = sectorId;
      });
    },
    setSectorSearch: (search) => {
      set((store) => {
        store.worlds.currentWorld.currentWorldSectors.sectorSearch = search;
      });
    },
    setOpenSectorTab: (tab) => {
      set((store) => {
        store.worlds.currentWorld.currentWorldSectors.openSectorTab = tab;
      });
    },

    subscribe: (worldId) => {
      let active = true;

      api
        .get<any[]>(`/api/worlds/${worldId}/sectors`)
        .then((rows) => {
          if (!active) return;
          set((store) => {
            rows.forEach((row) => {
              store.worlds.currentWorld.currentWorldSectors.sectors[row.id] = toSector(row);
            });
          });
        })
        .catch(() => {});

      return () => { active = false; };
    },

    createSector: async () => {
      const worldId = getState().worlds.currentWorld.currentWorldId;
      if (!worldId) return Promise.reject("No world found");
      const row = await api.post<any>(`/api/worlds/${worldId}/sectors`, {
        name: "New Sector",
        sharedWithPlayers: true,
        mapJson: {},
      });
      const sector = toSector(row);
      set((store) => {
        store.worlds.currentWorld.currentWorldSectors.sectors[row.id] = sector;
        store.worlds.currentWorld.currentWorldSectors.openSectorId = row.id;
      });
      return row.id;
    },

    updateSector: async (sector) => {
      const state = getState();
      const worldId = state.worlds.currentWorld.currentWorldId;
      const openSectorId = state.worlds.currentWorld.currentWorldSectors.openSectorId;
      if (!worldId) return Promise.reject("No world open");
      if (!openSectorId) return Promise.reject("No sector open");
      const { map, createdDate: _c, ...rest } = sector as any;
      const patch: any = { ...rest };
      if (map !== undefined) patch.mapJson = map;
      const row = await api.patch<any>(`/api/worlds/${worldId}/sectors/${openSectorId}`, patch);
      const updated = toSector(row);
      set((store) => {
        store.worlds.currentWorld.currentWorldSectors.sectors[openSectorId] = updated;
      });
    },

    updateName: async (name) => {
      const state = getState();
      const worldId = state.worlds.currentWorld.currentWorldId;
      const openSectorId = state.worlds.currentWorld.currentWorldSectors.openSectorId;
      if (!worldId) return Promise.reject("No world open");
      if (!openSectorId) return Promise.reject("No sector open");
      await api.patch(`/api/worlds/${worldId}/sectors/${openSectorId}`, { name });
      set((store) => {
        const sector = store.worlds.currentWorld.currentWorldSectors.sectors[openSectorId];
        if (sector) sector.name = name;
      });
    },

    updateHex: async (row, col, content) => {
      const state = getState();
      const worldId = state.worlds.currentWorld.currentWorldId;
      const openSectorId = state.worlds.currentWorld.currentWorldSectors.openSectorId;
      if (!worldId) return Promise.reject("No world open");
      if (!openSectorId) return Promise.reject("No sector open");

      const currentSector = state.worlds.currentWorld.currentWorldSectors.sectors[openSectorId];
      const newMap = JSON.parse(JSON.stringify(currentSector?.map ?? {}));
      if (!newMap[row]) newMap[row] = {};
      if (content) {
        newMap[row][col] = content;
      } else {
        delete newMap[row][col];
      }

      set((store) => {
        const sector = store.worlds.currentWorld.currentWorldSectors.sectors[openSectorId];
        if (sector) {
          if (!sector.map[row]) sector.map[row] = {};
          if (content) {
            sector.map[row][col] = content;
          } else {
            delete sector.map[row][col];
          }
        }
      });

      await api.patch(`/api/worlds/${worldId}/sectors/${openSectorId}`, { mapJson: newMap });
    },

    updateRegion: async (region) => {
      const state = getState();
      const worldId = state.worlds.currentWorld.currentWorldId;
      const openSectorId = state.worlds.currentWorld.currentWorldSectors.openSectorId;
      if (!worldId) return Promise.reject("No world open");
      if (!openSectorId) return Promise.reject("No sector open");
      await api.patch(`/api/worlds/${worldId}/sectors/${openSectorId}`, {
        region: region ?? null,
      });
      set((store) => {
        const sector = store.worlds.currentWorld.currentWorldSectors.sectors[openSectorId];
        if (sector) sector.region = region;
      });
    },

    deleteSector: async () => {
      const state = getState();
      const worldId = state.worlds.currentWorld.currentWorldId;
      const openSectorId = state.worlds.currentWorld.currentWorldSectors.openSectorId;
      if (!worldId) return Promise.reject("No world open");
      if (!openSectorId) return Promise.reject("No sector open");
      await api.del(`/api/worlds/${worldId}/sectors/${openSectorId}`);
      set((store) => {
        delete store.worlds.currentWorld.currentWorldSectors.sectors[openSectorId];
        store.worlds.currentWorld.currentWorldSectors.openSectorId = undefined;
      });
    },

    subscribeToSectorNotes: (sectorId, isPrivate) => {
      const worldId = getState().worlds.currentWorld.currentWorldId;
      if (!worldId) return () => {};

      const stateKey = isPrivate ? "openSectorGMNotes" : "openSectorNotes";
      const noteField = isPrivate ? "privateNotes" : "publicNotes";

      let active = true;
      api
        .get<any>(`/api/worlds/${worldId}/sectors/${sectorId}`)
        .then((row) => {
          if (!active || !row?.[noteField]) return;
          const content = new Uint8Array(row[noteField].data ?? row[noteField]);
          set((store) => {
            (store.worlds.currentWorld.currentWorldSectors as any)[stateKey] = content;
          });
        })
        .catch(() => {});

      return () => { active = false; };
    },

    updateSectorNotes: async (sectorId, notes, isPrivate) => {
      const worldId = getState().worlds.currentWorld.currentWorldId;
      if (!worldId) return;
      await api.patch(`/api/worlds/${worldId}/sectors/${sectorId}/notes`, {
        isPrivate: isPrivate ?? false,
        content: Array.from(notes),
      });
      const stateKey = isPrivate ? "openSectorGMNotes" : "openSectorNotes";
      set((store) => {
        (store.worlds.currentWorld.currentWorldSectors as any)[stateKey] = notes;
      });
    },

    resetStoreNotes: () => {
      set((store) => {
        store.worlds.currentWorld.currentWorldSectors.openSectorGMNotes = undefined;
        store.worlds.currentWorld.currentWorldSectors.openSectorNotes = undefined;
      });
    },

    resetStore: () => {
      getState().worlds.currentWorld.currentWorldSectors.locations.resetStore();
      set((store) => {
        store.worlds.currentWorld.currentWorldSectors = {
          ...store.worlds.currentWorld.currentWorldSectors,
          ...defaultSectorSlice,
        };
      });
    },
  };
};
