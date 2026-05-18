import { CreateSliceType } from "stores/store.type";
import { GameLogSlice } from "./gameLog.slice.type";
import { defaultGameLogSlice } from "./gameLog.slice.default";
import { api } from "config/api.config";

export const createGameLogSlice: CreateSliceType<GameLogSlice> = (
  _set,
  getState
) => ({
  ...defaultGameLogSlice,

  addRoll: ({ characterId, campaignId, roll }) => {
    const entityType = campaignId ? "campaign" : "character";
    const entityId = campaignId ?? characterId!;
    return api
      .post<{ id: string }>(
        `/api/game-log?entityType=${entityType}&entityId=${entityId}`,
        roll
      )
      .then((row) => row.id);
  },

  updateRoll: (id, roll) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    const entityType = campaignId ? "campaign" : "character";
    return api.patch<void>(`/api/game-log/${id}?entityType=${entityType}`, roll);
  },

  removeRoll: (id) => {
    return api.del<void>(`/api/game-log/${id}`);
  },

  resetStore: () => {},
});
