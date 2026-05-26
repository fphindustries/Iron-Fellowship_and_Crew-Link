import { CreateSliceType } from "stores/store.type";
import { CurrentCampaignSlice } from "./currentCampaign.slice.type";
import { defaultCurrentCampaignSlice } from "./currentCampaign.slice.default";
import { createCampaignTracksSlice } from "./tracks/campaignTracks.slice";
import { createCampaignCharactersSlice } from "./characters/campaignCharacters.slice";
import { createSharedAssetsSlice } from "./sharedAssets/sharedAssets.slice";
import { api } from "config/api.config";

export const createCurrentCampaignSlice: CreateSliceType<
  CurrentCampaignSlice
> = (...params) => {
  const [set, getState] = params;
  return {
    ...defaultCurrentCampaignSlice,

    assets: createSharedAssetsSlice(...params),
    characters: createCampaignCharactersSlice(...params),
    tracks: createCampaignTracksSlice(...params),

    setCurrentCampaignId: (campaignId) => {
      const state = getState();
      const campaign = campaignId
        ? state.campaigns.campaignMap[campaignId]
        : undefined;

      if (campaignId) {
        set((store) => {
          store.campaigns.currentCampaign.currentCampaignId = campaignId;
        });
        state.campaigns.currentCampaign.setCurrentCampaign(campaign);
      } else {
        state.campaigns.currentCampaign.resetStore();
      }
      state.worlds.currentWorld.setCurrentWorldId(campaign?.worldId);
    },

    setCurrentCampaign: (campaign) => {
      const state = getState();
      if (campaign) {
        const loadedCharacterIds = Object.keys(
          state.campaigns.currentCampaign.characters.characterMap ?? {}
        );
        const campaignCharacterIds = campaign?.characters.map(
          (character) => character.characterId
        );
        set((store) => {
          loadedCharacterIds.forEach((characterId) => {
            if (!campaignCharacterIds.includes(characterId)) {
              delete store.campaigns.currentCampaign.characters.characterMap[characterId];
            }
          });
        });
      }

      set((store) => {
        store.campaigns.currentCampaign.currentCampaign = campaign;
      });

      state.worlds.currentWorld.setCurrentWorldId(campaign?.worldId);
    },

    updateCampaignWorld: async (worldId) => {
      const state = getState();
      const campaignId = state.campaigns.currentCampaign.currentCampaignId;
      if (!campaignId) return Promise.reject("Campaign Id not found");

      if (worldId) {
        const gmIds = state.campaigns.currentCampaign.currentCampaign?.gmIds ?? [];
        await api.patch<void>(`/api/campaigns/${campaignId}`, { worldId });
        // Add all GMs as world owners
        for (const gmId of gmIds) {
          await api
            .post<void>(`/api/worlds/${worldId}/owners`, { userId: gmId })
            .catch(() => {});
        }
      } else {
        await api.patch<void>(`/api/campaigns/${campaignId}`, { worldId: null });
      }
    },

    updateCampaignGM: async (gmId, shouldRemove) => {
      const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
      const worldId = getState().campaigns.currentCampaign.currentCampaign?.worldId;
      if (!campaignId) return Promise.reject("Campaign Id not found");

      if (shouldRemove) {
        await api.del<void>(`/api/campaigns/${campaignId}/gms/${gmId}`);
      } else {
        await api.post<void>(`/api/campaigns/${campaignId}/gms`, { userId: gmId });
        if (worldId) {
          await api
            .post<void>(`/api/worlds/${worldId}/owners`, { userId: gmId })
            .catch(() => {});
        }
      }
    },

    deleteCampaign: () => {
      const state = getState();
      const campaignId = state.campaigns.currentCampaign.currentCampaignId;
      if (!campaignId) return Promise.reject("Campaign is not open");
      return api.del<void>(`/api/campaigns/${campaignId}`);
    },

    leaveCampaign: async () => {
      const state = getState();
      const uid = state.auth.uid;
      const campaignId = state.campaigns.currentCampaign.currentCampaignId;
      const campaign = state.campaigns.currentCampaign.currentCampaign;
      if (!campaign || !campaignId) return Promise.reject("Campaign is not open");

      if (campaign.gmIds?.includes(uid)) {
        await api.del<void>(`/api/campaigns/${campaignId}/gms/${uid}`).catch(() => {});
      }
      const userCharacters = campaign.characters.filter((c) => c.uid === uid);
      for (const { characterId } of userCharacters) {
        await api
          .del<void>(`/api/campaigns/${campaignId}/characters/${characterId}`)
          .catch(() => {});
      }
      await api.del<void>(`/api/campaigns/${campaignId}/members/${uid}`);
    },

    removePlayerFromCampaign: async (uid) => {
      const state = getState();
      const campaignId = state.campaigns.currentCampaign.currentCampaignId;
      const campaign = state.campaigns.currentCampaign.currentCampaign;
      if (!campaign || !campaignId) return Promise.reject("Campaign is not open");

      if (campaign.gmIds?.includes(uid)) {
        await api.del<void>(`/api/campaigns/${campaignId}/gms/${uid}`).catch(() => {});
      }
      const userCharacters = campaign.characters.filter((c) => c.uid === uid);
      for (const { characterId } of userCharacters) {
        await api
          .del<void>(`/api/campaigns/${campaignId}/characters/${characterId}`)
          .catch(() => {});
      }
      await api.del<void>(`/api/campaigns/${campaignId}/members/${uid}`);
    },

    addCharacter: (characterId) => {
      const state = getState();
      const uid = state.auth.uid;
      const campaignId = state.campaigns.currentCampaign.currentCampaignId;
      if (!campaignId) return Promise.reject("No campaign found.");
      return api.post<void>(`/api/campaigns/${campaignId}/characters`, { characterId, userId: uid });
    },

    removeCharacter: (uid, characterId) => {
      const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
      if (!campaignId) return Promise.reject("No campaign found.");
      return api.del<void>(`/api/campaigns/${campaignId}/characters/${characterId}`);
    },

    updateCampaignConditionMeter: (conditionMeterKey, value) => {
      const state = getState();
      const campaignId = state.campaigns.currentCampaign.currentCampaignId;
      if (!campaignId) return Promise.reject("No campaign found.");
      const existing = state.campaigns.currentCampaign.currentCampaign;
      const previousValue = existing?.conditionMeters?.[conditionMeterKey] ?? 0;
      const conditionMeters = { ...(existing?.conditionMeters ?? {}), [conditionMeterKey]: value };
      state.sessionLog.logStatChangeEvent({
        stat: conditionMeterKey,
        previousValue,
        newValue: value,
      });
      return api.patch<void>(`/api/campaigns/${campaignId}`, { conditionMeters });
    },

    updateCampaign: (campaign) => {
      const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
      if (!campaignId) return Promise.reject("No campaign found.");
      return api.patch<void>(`/api/campaigns/${campaignId}`, campaign);
    },

    resetStore: () => {
      const state = getState();
      state.campaigns.currentCampaign.tracks.resetStore();
      state.campaigns.currentCampaign.characters.resetStore();
      state.campaigns.currentCampaign.assets.resetStore();
      state.notes.resetStore();
      state.gameLog.resetStore();

      set((store) => {
        store.campaigns.currentCampaign = {
          ...store.campaigns.currentCampaign,
          ...defaultCurrentCampaignSlice,
        };
      });
    },
  };
};
