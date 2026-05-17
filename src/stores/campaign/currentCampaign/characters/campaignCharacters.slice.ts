import { CreateSliceType } from "stores/store.type";
import { CampaignCharactersSlice } from "./campaignCharacters.slice.type";
import { defaultCampaignCharactersSlice } from "./campaignCharacters.slice.default";
import { TrackStatus, TrackTypes, Track } from "types/Track.type";
import { api } from "config/api.config";
import { AssetDocument } from "api-calls/assets/_asset.type";

function toAsset(row: any): AssetDocument {
  return { id: row.id, ...(row.dataJson ?? {}) };
}

function toTrack(row: any): Track {
  return {
    ...(row.dataJson ?? {}),
    createdDate: row.createdAt ? new Date(row.createdAt) : new Date(),
  } as Track;
}

export const createCampaignCharactersSlice: CreateSliceType<
  CampaignCharactersSlice
> = (set) => ({
  ...defaultCampaignCharactersSlice,

  listenToCampaignCharacters: (characterIds: string[]) => {
    let active = true;
    const fetches = characterIds.map((characterId) =>
      api
        .get<any>(`/api/characters/${characterId}`)
        .then((char) => {
          if (!active || !char) return;
          set((store) => {
            store.campaigns.currentCampaign.characters.characterMap[characterId] = char;
          });
        })
        .catch(() => {})
    );
    void fetches;
    return () => {
      active = false;
    };
  },

  listenToCampaignCharacterAssets: (characterIds: string[]) => {
    let active = true;
    characterIds.forEach((characterId) => {
      api
        .get<any[]>(`/api/characters/${characterId}/assets`)
        .then((rows) => {
          if (!active) return;
          set((store) => {
            store.campaigns.currentCampaign.characters.characterAssets[characterId] =
              rows.map(toAsset);
          });
        })
        .catch(() => {});
    });
    return () => {
      active = false;
    };
  },

  listenToCampaignCharacterTracks: (characterIds: string[]) => {
    let active = true;
    characterIds.forEach((characterId) => {
      api
        .get<any[]>(`/api/characters/${characterId}/tracks?status=${TrackStatus.Active}`)
        .then((rows) => {
          if (!active) return;
          set((store) => {
            if (!store.campaigns.currentCampaign.characters.characterTracks[characterId]) {
              store.campaigns.currentCampaign.characters.characterTracks[characterId] = {
                [TrackTypes.Fray]: {},
                [TrackTypes.Journey]: {},
                [TrackTypes.Vow]: {},
                [TrackTypes.SceneChallenge]: {},
                [TrackTypes.Clock]: {},
              };
            }
            rows.forEach((row) => {
              const track = toTrack(row);
              store.campaigns.currentCampaign.characters.characterTracks[
                characterId
              ][track.type][row.id] = track as any;
            });
          });
        })
        .catch(() => {});
    });
    return () => {
      active = false;
    };
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
