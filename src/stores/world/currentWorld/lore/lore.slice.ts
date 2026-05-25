import { CreateSliceType } from "stores/store.type";
import { LoreSlice } from "./lore.slice.type";
import { defaultLoreSlice } from "./lore.slice.default";
import { api } from "config/api.config";
import { fileToBase64 } from "lib/storage.lib";

function toLore(row: any) {
  return {
    name: row.name,
    imageFilenames: row.imageFilenames ?? [],
    updatedDate: row.updatedAt ? new Date(row.updatedAt) : new Date(),
    createdDate: row.createdAt ? new Date(row.createdAt) : new Date(),
    ...(row.dataJson ?? {}),
  };
}

export const createLoreSlice: CreateSliceType<LoreSlice> = (set, getState) => ({
  ...defaultLoreSlice,

  subscribe: (_worldId: string) => {
    // Data is now fetched by useLoreQuery via useListenToLoreDocuments.
    return () => {};
  },

  setOpenLoreId: (loreId) => {
    set((store) => {
      store.worlds.currentWorld.currentWorldLore.openLoreId = loreId;
    });
  },
  setLoreSearch: (search) => {
    set((store) => {
      store.worlds.currentWorld.currentWorldLore.loreSearch = search;
    });
  },

  createLore: async () => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const row = await api.post<any>(`/api/worlds/${worldId}/lore`, {
      name: "New Lore",
      dataJson: {},
    });
    const lore = toLore(row);
    set((store) => {
      store.worlds.currentWorld.currentWorldLore.loreMap[row.id] = {
        ...lore,
        gmProperties: undefined,
        notes: undefined,
      };
    });
    return row.id;
  },

  deleteLore: async (loreId) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    await api.del(`/api/worlds/${worldId}/lore/${loreId}`);
    set((store) => {
      delete store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
    });
  },

  updateLore: async (loreId, partialLore) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const { name, imageFilenames, updatedDate: _u, createdDate: _c, ...dataJson } = partialLore as any;
    const patch: any = {};
    if (name !== undefined) patch.name = name;
    if (imageFilenames !== undefined) patch.imageFilenames = imageFilenames;
    if (Object.keys(dataJson).length > 0) patch.dataJson = dataJson;
    const row = await api.patch<any>(`/api/worlds/${worldId}/lore/${loreId}`, patch);
    const updated = toLore(row);
    set((store) => {
      const existing = store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
      if (existing) {
        store.worlds.currentWorld.currentWorldLore.loreMap[loreId] = { ...existing, ...updated };
      }
    });
  },

  updateLoreGMNotes: async (loreId, notes) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    await api.patch(`/api/worlds/${worldId}/lore/${loreId}/private-notes`, {
      dataJson: { gmNotes: Array.from(notes) },
    });
  },

  updateLoreGMProperties: async (loreId, loreGMProperties) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    const { gmNotes: _gm, ...rest } = loreGMProperties as any;
    await api.patch(`/api/worlds/${worldId}/lore/${loreId}/private-notes`, {
      dataJson: rest,
    });
    set((store) => {
      const lore = store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
      if (lore) lore.gmProperties = { ...(lore.gmProperties ?? {}), ...loreGMProperties };
    });
  },

  updateLoreNotes: async (loreId, notes) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    await api.patch(`/api/worlds/${worldId}/lore/${loreId}/notes`, {
      content: Array.from(notes),
    });
  },

  uploadLoreImage: async (loreId, image) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const imageUrl = await fileToBase64(image);
    const imageFilenames = [imageUrl];
    await api.patch(`/api/worlds/${worldId}/lore/${loreId}`, { imageFilenames });
    set((store) => {
      const lore = store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
      if (lore) {
        lore.imageFilenames = imageFilenames;
        lore.imageUrl = imageUrl;
        store.worlds.currentWorld.doAnyDocsHaveImages = true;
      }
    });
  },

  removeLoreImage: async (loreId) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    if (!world.currentWorldLore.loreMap[loreId]?.imageFilenames?.[0]) return Promise.reject("Lore did not have an image");
    await api.patch(`/api/worlds/${worldId}/lore/${loreId}`, { imageFilenames: [] });
    set((store) => {
      const lore = store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
      if (lore) {
        lore.imageFilenames = [];
        lore.imageUrl = undefined;
      }
    });
  },

  subscribeToOpenLore: (_loreId) => {
    // Data is now fetched by useLoreDetailQuery via useListenToCurrentLoreDocument.
    return () => {};
  },

  resetStore: () => {
    set((store) => {
      store.worlds.currentWorld.currentWorldLore = {
        ...store.worlds.currentWorld.currentWorldLore,
        ...defaultLoreSlice,
      };
    });
  },
});
