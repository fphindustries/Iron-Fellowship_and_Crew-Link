import { CreateSliceType } from "stores/store.type";
import { GameLogSlice } from "./gameLog.slice.type";
import { defaultGameLogSlice } from "./gameLog.slice.default";
import { api } from "config/api.config";

export const createGameLogSlice: CreateSliceType<GameLogSlice> = (
  set,
  getState
) => ({
  ...defaultGameLogSlice,

  addRoll: ({ characterId, campaignId, roll }) => {
    if (!characterId && !campaignId) {
      return Promise.reject("Either character or campaign Id must be defined.");
    }
    const entityType = campaignId ? "campaign" : "character";
    const entityId = campaignId ?? characterId!;
    return api
      .post<any>(`/api/game-log?entityType=${entityType}&entityId=${entityId}`, roll)
      .then((row) => row.id as string);
  },

  updateRoll: (id, roll) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    const entityType = campaignId ? "campaign" : "character";
    if (!id) return Promise.reject("Log ID must be defined");
    return api.patch<void>(`/api/game-log/${id}?entityType=${entityType}`, roll);
  },

  removeRoll: (id) => {
    return api.del<void>(`/api/game-log/${id}`);
  },

  loadMoreLogs: () => {
    const state = getState();
    if (state.gameLog.loading) return;
    set((store) => {
      store.gameLog.totalLogsToLoad += 20;
    });
  },

  subscribe: (params) => {
    const { campaignId, characterId, totalLogsToLoad } = params;
    if (!campaignId && !characterId) return () => {};

    const entityType = campaignId ? "campaign" : "character";
    const entityId = campaignId ?? characterId!;

    let active = true;

    const state = getState();
    const isGM =
      (!campaignId ||
        state.campaigns.currentCampaign.currentCampaign?.gmIds?.includes(
          state.auth.uid
        )) ??
      false;

    set((store) => {
      store.gameLog.loading = true;
    });

    api
      .get<any[]>(
        `/api/game-log?entityType=${entityType}&entityId=${entityId}&limit=${totalLogsToLoad}`
      )
      .then((rows) => {
        if (!active) return;
        set((store) => {
          store.gameLog.loading = false;
          rows.forEach((row) => {
            const roll = row.dataJson as any;
            if (!isGM && roll?.gmsOnly) return;
            store.gameLog.logs[row.id] = roll;
          });
        });
      })
      .catch(() => {
        if (!active) return;
        set((store) => {
          store.gameLog.loading = false;
        });
      });

    return () => {
      active = false;
    };
  },

  resetStore: () => {
    set((store) => {
      store.gameLog = { ...store.gameLog, ...defaultGameLogSlice };
    });
  },
});
