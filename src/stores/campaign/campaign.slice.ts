import { CreateSliceType } from "stores/store.type";
import { CampaignSlice } from "./campaign.slice.type";
import { defaultCampaignSlice } from "./campaign.slice.default";
import { getErrorMessage } from "functions/getErrorMessage";
import { createCurrentCampaignSlice } from "./currentCampaign/currentCampaign.slice";
import { api } from "config/api.config";

export function toCampaignDocument(row: any): any {
  return {
    name: row.name,
    users: row.users ?? [],
    characters: row.characters ?? [],
    gmIds: row.gmIds ?? [],
    worldId: row.worldId ?? undefined,
    expansionIds: row.expansionIds ?? [],
    customTracks: row.customTracks ?? row.customTracksJson ?? {},
    conditionMeters: row.conditionMeters ?? row.conditionMetersJson ?? {},
    specialTracks: row.specialTracks ?? row.specialTracksJson ?? {},
    type: row.type ?? "solo",
    theme: row.theme ?? undefined,
  };
}

export const createCampaignSlice: CreateSliceType<CampaignSlice> = (
  ...params
) => {
  const [set, getState] = params;
  return {
    ...defaultCampaignSlice,
    currentCampaign: createCurrentCampaignSlice(...params),

    subscribe: (uid) => {
      if (!uid) return undefined;

      let active = true;

      api
        .get<any[]>(`/api/campaigns?uid=${uid}`)
        .then((rows) => {
          if (!active) return;
          set((store) => {
            rows.forEach((row) => {
              store.campaigns.campaignMap[row.id] = toCampaignDocument(row);
            });
            store.campaigns.loading = false;
          });
        })
        .catch((e) => {
          if (!active) return;
          set((store) => {
            store.campaigns.error = getErrorMessage(e, "Failed to load your campaigns.");
            store.campaigns.loading = false;
          });
        });

      return () => {
        active = false;
      };
    },

    createCampaign: async (campaignName, campaignType) => {
      const row = await api.post<any>("/api/campaigns", {
        name: campaignName,
        system: "starforged",
        type: campaignType ?? "solo",
      });
      return row.id;
    },

    getCampaign: async (campaignId) => {
      const existing = getState().campaigns.campaignMap[campaignId];
      if (existing) return existing;
      const row = await api.get<any>(`/api/campaigns/${campaignId}`);
      return toCampaignDocument(row);
    },

    addUserToCampaign: async (userId, campaignId) => {
      await api.post(`/api/campaigns/${campaignId}/members`, { userId });
    },
  };
};
