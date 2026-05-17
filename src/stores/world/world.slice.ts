import { CreateSliceType } from "stores/store.type";
import { WorldSlice } from "./world.slice.type";
import { defaultWorldSlice } from "./world.slice.default";
import { createCurrentWorldSlice } from "./currentWorld/currentWorld.slice";
import { getSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { api } from "config/api.config";

function toWorldDocument(row: any): any {
  return {
    name: row.name,
    ownerIds: row.ownerIds ?? [],
    settingKey: row.settingKey ?? undefined,
    newTruths: row.newTruthsJson ?? {},
    system: row.system ?? "starforged",
  };
}

export const createWorldSlice: CreateSliceType<WorldSlice> = (...params) => {
  const [set, getState] = params;
  return {
    ...defaultWorldSlice,
    currentWorld: createCurrentWorldSlice(...params),

    subscribeToOwnedWorlds: (uid) => {
      if (!uid) return undefined;

      let active = true;

      api
        .get<any[]>(`/api/worlds?uid=${uid}`)
        .then((rows) => {
          if (!active) return;
          set((store) => {
            rows.forEach((row) => {
              store.worlds.worldMap[row.id] = toWorldDocument(row);
              if (row.id === store.worlds.currentWorld.currentWorldId) {
                store.worlds.currentWorld.currentWorld = toWorldDocument(row);
              }
            });
            store.worlds.loading = false;
          });
        })
        .catch((e) => {
          if (!active) return;
          console.error(e);
          set((store) => {
            store.worlds.error = "Failed to load worlds.";
            store.worlds.loading = false;
          });
        });

      return () => { active = false; };
    },

    subscribeToNonOwnedWorlds: (campaignWorldIds, userOwnedWorldIds) => {
      const worldIdsToLoad = campaignWorldIds.filter(
        (worldId) => !userOwnedWorldIds.includes(worldId)
      );

      const cleanups: (() => void)[] = [];

      worldIdsToLoad.forEach((worldId) => {
        let active = true;
        cleanups.push(() => { active = false; });

        api.get<any>(`/api/worlds/${worldId}`).then((row) => {
          if (!active) return;
          set((store) => {
            store.worlds.worldMap[worldId] = toWorldDocument(row);
            if (worldId === store.worlds.currentWorld.currentWorldId) {
              store.worlds.currentWorld.currentWorld = toWorldDocument(row);
            }
          });
        }).catch(console.error);
      });

      return () => cleanups.forEach((c) => c());
    },

    createWorld: async () => {
      const uid = getState().auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const system = getSystem();
      const defaultSettingKey =
        system === GAME_SYSTEMS.IRONSWORN ? "ironlands" : "the_forge";
      const row = await api.post<any>("/api/worlds", {
        name: "New World",
        system: system === GAME_SYSTEMS.IRONSWORN ? "ironsworn" : "starforged",
        settingKey: defaultSettingKey,
      });
      set((store) => {
        store.worlds.worldMap[row.id] = toWorldDocument({ ...row, ownerIds: [uid] });
      });
      return row.id;
    },

    deleteWorld: async (worldId) => {
      await api.del(`/api/worlds/${worldId}`);
    },

    updateWorldGuide: async (worldId, guideId, shouldRemove) => {
      if (shouldRemove) {
        await api.del(`/api/worlds/${worldId}/owners/${guideId}`);
      } else {
        await api.post(`/api/worlds/${worldId}/owners`, { userId: guideId });
      }
    },
  };
};
