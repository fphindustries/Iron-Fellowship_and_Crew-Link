import { CreateSliceType } from "stores/store.type";
import { SettingsSlice } from "./settings.slice.type";
import { defaultSettings } from "./settings.slice.default";
import { api } from "config/api.config";

export const createSettingsSlice: CreateSliceType<SettingsSlice> = (
  set,
  getState
) => ({
  ...defaultSettings,

  subscribe: (uids) => {
    getState().users.loadUserDocuments(uids);
    let active = true;

    uids.forEach((uid) => {
      api.get<any[]>("/api/settings/custom-moves").then((moves) => {
        if (!active) return;
        set((store) => {
          store.settings.customMoves[uid] = moves.map((m) => m.dataJson) as any;
        });
      }).catch(console.error);

      api.get<any[]>("/api/settings/custom-oracles").then((oracles) => {
        if (!active) return;
        set((store) => {
          store.settings.customOracles[uid] = oracles.map((o) => o.dataJson) as any;
        });
      }).catch(console.error);
    });

    return () => {
      active = false;
      getState().settings.resetStore();
    };
  },

  subscribeToSettings: ({ characterId, campaignId }) => {
    // Entity settings are loaded per-page; stub returns empty cleanup
    return () => {};
  },

  subscribeToPinnedOracleSettings: (uid) => {
    let active = true;

    api.get<any>("/api/settings/oracle").then((row) => {
      if (!active) return;
      set((store) => {
        store.settings.pinnedOraclesIds = row?.pinnedOracleIdsJson ?? {};
      });
    }).catch(console.error);

    return () => { active = false; };
  },

  toggleCustomMoveVisibility: async (moveId, hidden) => {
    // TODO: implement via /api/settings entity settings
  },
  toggleCustomOracleVisibility: async (oracleId, hidden) => {
    // TODO: implement via /api/settings entity settings
  },

  addCustomMove: async (customMove) => {
    const row = await api.post<any>("/api/settings/custom-moves", customMove);
    return row.id;
  },
  updateCustomMove: async (moveId, customMove) => {
    await api.patch(`/api/settings/custom-moves/${moveId}`, customMove);
  },
  removeCustomMove: async (moveId) => {
    await api.del(`/api/settings/custom-moves/${moveId}`);
  },

  addCustomOracle: async (customOracle) => {
    const row = await api.post<any>("/api/settings/custom-oracles", customOracle);
    return row.id;
  },
  updateCustomOracle: async (oracleId, customOracle) => {
    await api.patch(`/api/settings/custom-oracles/${oracleId}`, customOracle);
  },
  removeCustomOracle: async (oracleId) => {
    await api.del(`/api/settings/custom-oracles/${oracleId}`);
  },
  togglePinnedOracle: async (oracleId, pinned) => {
    const current = getState().settings.pinnedOraclesIds ?? {};
    const updated = { ...current };
    if (pinned) {
      updated[oracleId] = true;
    } else {
      delete updated[oracleId];
    }
    await api.patch("/api/settings/oracle", updated);
    set((store) => {
      store.settings.pinnedOraclesIds = updated;
    });
  },

  updateSettings: async (_settings, _useUpdate) => {
    // TODO: implement via /api/settings entity settings
  },

  resetStore: () => {
    set((state) => {
      const pinnedOraclesIds = state.settings.pinnedOraclesIds;
      state.settings = {
        ...state.settings,
        ...defaultSettings,
        pinnedOraclesIds,
      };
    });
  },
});
