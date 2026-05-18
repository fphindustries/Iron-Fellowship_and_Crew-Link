import { CreateSliceType } from "stores/store.type";
import { CampaignCharactersSlice } from "./campaignCharacters.slice.type";
import { defaultCampaignCharactersSlice } from "./campaignCharacters.slice.default";
import { api } from "config/api.config";

export const createCampaignCharactersSlice: CreateSliceType<
  CampaignCharactersSlice
> = (set) => ({
  ...defaultCampaignCharactersSlice,

  listenToCampaignCharacters: (_characterIds: string[]) => {
    // Data is now fetched by useCampaignCharactersQueries via useListenToCurrentCampaignCharacters.
    return () => {};
  },

  listenToCampaignCharacterAssets: (_characterIds: string[]) => {
    // Data is now fetched by useCampaignCharacterAssetsQueries via useListenToCurrentCampaignCharacterAssets.
    return () => {};
  },

  listenToCampaignCharacterTracks: (_characterIds: string[]) => {
    // Data is now fetched by useCampaignCharacterTracksQueries via useListenToCurrentCampaignCharacterTracks.
    return () => {};
  },

  updateCharacter: (characterId, character) => {
    return api.patch<void>(`/api/characters/${characterId}`, character);
  },

  resetStore: () => {
    set((store) => {
      store.campaigns.currentCampaign.characters = {
        ...store.campaigns.currentCampaign.characters,
        ...defaultCampaignCharactersSlice,
      };
    });
  },
});
