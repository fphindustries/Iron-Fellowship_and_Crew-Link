import { CreateSliceType } from "stores/store.type";
import { LoreSlice } from "./lore.slice.type";
import { defaultLoreSlice } from "./lore.slice.default";
import { api } from "config/api.config";
import { uploadImage, deleteImage, getImageUrl } from "lib/storage.lib";

function constructLoreImagePath(worldId: string, loreId: string) {
  return `/worlds/${worldId}/lore/${loreId}`;
}

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

  subscribe: (worldId: string) => {
    let active = true;

    api
      .get<any[]>(`/api/worlds/${worldId}/lore`)
      .then((rows) => {
        if (!active) return;
        set((store) => {
          store.worlds.currentWorld.currentWorldLore.loading = false;
          rows.forEach((row) => {
            const lore = toLore(row);
            if ((lore.imageFilenames?.length ?? 0) > 0) {
              store.worlds.currentWorld.doAnyDocsHaveImages = true;
            }
            const existing = store.worlds.currentWorld.currentWorldLore.loreMap[row.id];
            store.worlds.currentWorld.currentWorldLore.loreMap[row.id] = {
              ...lore,
              gmProperties: existing?.gmProperties,
              notes: existing?.notes,
              imageUrl: (lore.imageFilenames?.length ?? 0) > 0 ? existing?.imageUrl : undefined,
            };
          });
        });
      })
      .catch((error) => {
        if (!active) return;
        set((store) => {
          store.worlds.currentWorld.currentWorldLore.error = String(error);
        });
      });

    return () => { active = false; };
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
    const filename = world.currentWorldLore.loreMap[loreId]?.imageFilenames?.[0];
    if (filename) {
      await deleteImage(constructLoreImagePath(worldId, loreId), filename).catch(() => {});
    }
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
    const oldFilename = world.currentWorldLore.loreMap[loreId]?.imageFilenames?.[0];
    const imagePath = constructLoreImagePath(worldId, loreId);
    if (oldFilename) await deleteImage(imagePath, oldFilename).catch(() => {});
    await uploadImage(imagePath, image);
    const imageFilenames = [image.name];
    await api.patch(`/api/worlds/${worldId}/lore/${loreId}`, { imageFilenames });
    const imageUrl = await getImageUrl(`${imagePath}/${image.name}`);
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
    const filename = world.currentWorldLore.loreMap[loreId]?.imageFilenames?.[0];
    if (!worldId) return Promise.reject("No world found");
    if (!filename) return Promise.reject("Lore did not have an image");
    await deleteImage(constructLoreImagePath(worldId, loreId), filename);
    await api.patch(`/api/worlds/${worldId}/lore/${loreId}`, { imageFilenames: [] });
    set((store) => {
      const lore = store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
      if (lore) {
        lore.imageFilenames = [];
        lore.imageUrl = undefined;
      }
    });
  },

  subscribeToOpenLore: (loreId) => {
    const state = getState();
    const worldId = state.worlds.currentWorld.currentWorldId;
    const isWorldOwner =
      state.worlds.currentWorld.currentWorld?.ownerIds?.includes(state.auth.uid ?? "") ?? false;
    if (!worldId) return () => {};

    let active = true;

    api
      .get<any>(`/api/worlds/${worldId}/lore/${loreId}/notes`)
      .then((row) => {
        if (!active || !row?.content) return;
        const content = new Uint8Array(row.content.data ?? row.content);
        set((store) => {
          const lore = store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
          if (lore) lore.notes = content;
        });
      })
      .catch(() => {});

    if (isWorldOwner) {
      api
        .get<any>(`/api/worlds/${worldId}/lore/${loreId}/private-notes`)
        .then((row) => {
          if (!active) return;
          set((store) => {
            const lore = store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
            if (lore) lore.gmProperties = row?.dataJson ?? null;
          });
        })
        .catch(() => {});
    } else {
      set((store) => {
        const lore = store.worlds.currentWorld.currentWorldLore.loreMap[loreId];
        if (lore) lore.gmProperties = null;
      });
    }

    return () => { active = false; };
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
