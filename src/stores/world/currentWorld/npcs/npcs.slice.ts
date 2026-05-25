import { CreateSliceType } from "stores/store.type";
import { NPCsSlice } from "./npcs.slice.type";
import { defaultNPCsSlice } from "./npcs.slice.default";
import { api } from "config/api.config";
import { fileToBase64 } from "lib/storage.lib";
import { NPC } from "types/NPCs.type";

function toNPC(row: any): NPC {
  return {
    name: row.name,
    imageFilenames: row.imageFilenames ?? [],
    updatedDate: row.updatedAt ? new Date(row.updatedAt) : new Date(),
    createdDate: row.createdAt ? new Date(row.createdAt) : new Date(),
    ...(row.dataJson ?? {}),
  };
}

export const createNPCsSlice: CreateSliceType<NPCsSlice> = (set, getState) => ({
  ...defaultNPCsSlice,

  subscribe: (_worldId: string) => {
    // Data is now fetched by useNPCsQuery via useListenToNPCs.
    return () => {};
  },

  setOpenNPCId: (npcId) => {
    set((store) => {
      store.worlds.currentWorld.currentWorldNPCs.openNPCId = npcId;
    });
  },
  setNPCSearch: (search) => {
    set((store) => {
      store.worlds.currentWorld.currentWorldNPCs.npcSearch = search;
    });
  },

  createNPC: async (npc) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const { name, imageFilenames, updatedDate: _u, createdDate: _c, ...dataJson } = (npc ?? {}) as any;
    const row = await api.post<any>(`/api/worlds/${worldId}/npcs`, {
      name: name ?? "New NPC",
      imageFilenames: imageFilenames ?? [],
      dataJson: dataJson ?? {},
    });
    const npcDoc = toNPC(row);
    set((store) => {
      store.worlds.currentWorld.currentWorldNPCs.npcMap[row.id] = {
        ...npcDoc,
        gmProperties: undefined,
        notes: undefined,
      };
    });
    return row.id;
  },

  deleteNPC: async (npcId) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    await api.del(`/api/worlds/${worldId}/npcs/${npcId}`);
    set((store) => {
      delete store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
    });
  },

  updateNPC: async (npcId, partialNPC) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const { name, imageFilenames, updatedDate: _u, createdDate: _c, ...dataJson } = partialNPC as any;
    const patch: any = {};
    if (name !== undefined) patch.name = name;
    if (imageFilenames !== undefined) patch.imageFilenames = imageFilenames;
    if (Object.keys(dataJson).length > 0) patch.dataJson = dataJson;
    const row = await api.patch<any>(`/api/worlds/${worldId}/npcs/${npcId}`, patch);
    const updated = toNPC(row);
    set((store) => {
      const existing = store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
      if (existing) {
        store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId] = { ...existing, ...updated };
      }
    });
  },

  updateNPCGMNotes: async (npcId, notes) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    await api.patch(`/api/worlds/${worldId}/npcs/${npcId}/private-notes`, {
      dataJson: { gmNotes: Array.from(notes) },
    });
  },

  updateNPCGMProperties: async (npcId, gmProperties) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    const { gmNotes: _gmNotes, ...rest } = gmProperties as any;
    await api.patch(`/api/worlds/${worldId}/npcs/${npcId}/private-notes`, {
      dataJson: rest,
    });
    set((store) => {
      const npc = store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
      if (npc) npc.gmProperties = { ...(npc.gmProperties ?? {}), ...gmProperties };
    });
  },

  updateNPCNotes: async (npcId, notes) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    await api.patch(`/api/worlds/${worldId}/npcs/${npcId}/notes`, {
      content: Array.from(notes),
    });
  },

  updateNPCCharacterBond: async (npcId, characterId, bonded) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    const npc = getState().worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
    const characterBonds = { ...(npc?.characterBonds ?? {}), [characterId]: bonded };
    await api.patch(`/api/worlds/${worldId}/npcs/${npcId}`, {
      dataJson: { ...(npc as any)?.dataJson, characterBonds },
    });
    set((store) => {
      const n = store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
      if (n) n.characterBonds = characterBonds;
    });
  },

  updateNPCCharacterConnection: async (npcId, characterId, connected) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    const npc = getState().worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
    const characterConnections = { ...(npc?.characterConnections ?? {}), [characterId]: connected };
    await api.patch(`/api/worlds/${worldId}/npcs/${npcId}`, {
      dataJson: { ...(npc as any)?.dataJson, characterConnections },
    });
    set((store) => {
      const n = store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
      if (n) n.characterConnections = characterConnections;
    });
  },

  updateNPCCharacterBondValue: async (npcId, characterId, value) => {
    const worldId = getState().worlds.currentWorld.currentWorldId;
    if (!worldId) return;
    const npc = getState().worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
    const characterBondProgress = { ...(npc?.characterBondProgress ?? {}), [characterId]: value };
    await api.patch(`/api/worlds/${worldId}/npcs/${npcId}`, {
      dataJson: { ...(npc as any)?.dataJson, characterBondProgress },
    });
    set((store) => {
      const n = store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
      if (n) n.characterBondProgress = characterBondProgress;
    });
  },

  uploadNPCImage: async (npcId, image) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    const imageUrl = await fileToBase64(image);
    const imageFilenames = [imageUrl];
    await api.patch(`/api/worlds/${worldId}/npcs/${npcId}`, { imageFilenames });
    set((store) => {
      const npc = store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
      if (npc) {
        npc.imageFilenames = imageFilenames;
        npc.imageUrl = imageUrl;
        store.worlds.currentWorld.doAnyDocsHaveImages = true;
      }
    });
  },

  removeNPCImage: async (npcId) => {
    const world = getState().worlds.currentWorld;
    const worldId = world.currentWorldId;
    if (!worldId) return Promise.reject("No world found");
    if (!world.currentWorldNPCs.npcMap[npcId]?.imageFilenames?.[0]) return Promise.reject("No image found to remove");
    await api.patch(`/api/worlds/${worldId}/npcs/${npcId}`, { imageFilenames: [] });
    set((store) => {
      const npc = store.worlds.currentWorld.currentWorldNPCs.npcMap[npcId];
      if (npc) {
        npc.imageFilenames = [];
        npc.imageUrl = undefined;
      }
    });
  },

  subscribeToOpenNPC: (_npcId) => {
    // Data is now fetched by useNPCDetailQuery via useListenToCurrentNPC.
    return () => {};
  },

  resetStore: () => {
    set((store) => {
      store.worlds.currentWorld.currentWorldNPCs = {
        ...store.worlds.currentWorld.currentWorldNPCs,
        ...defaultNPCsSlice,
      };
    });
  },
});
