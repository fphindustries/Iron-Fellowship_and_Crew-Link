import { CreateSliceType } from "stores/store.type";
import { CampaignTracksSlice } from "./campaignTracks.slice.type";
import { defaultCampaignTracksSlice } from "./campaignTracks.slice.default";
import { TrackStatus, Track } from "types/Track.type";
import { api } from "config/api.config";

function toTrack(row: any): Track {
  const data = row.dataJson ?? {};
  return {
    ...data,
    createdDate: row.createdAt ? new Date(row.createdAt) : new Date(),
  } as Track;
}

export const createCampaignTracksSlice: CreateSliceType<CampaignTracksSlice> = (
  set,
  getState
) => ({
  ...defaultCampaignTracksSlice,

  subscribe: (_campaignId, _status) => {
    // Data is now fetched by useCampaignTracksQuery via useListenToCampaignTracks.
    return () => {};
  },

  addTrack: (track) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    const { createdDate, ...rest } = track as any;
    return api
      .post<any>(`/api/campaigns/${campaignId}/tracks`, {
        dataJson: rest,
        createdAt: (createdDate ?? new Date()).toISOString(),
      })
      .then((row) => {
        const saved = toTrack(row);
        set((store) => {
          store.campaigns.currentCampaign.tracks.trackMap[
            saved.status
          ][saved.type][row.id] = saved as any;
        });
      });
  },

  updateTrack: (trackId, track) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    const existing = Object.values(TrackStatus).flatMap((status) =>
      Object.values(getState().campaigns.currentCampaign.tracks.trackMap[status]).flatMap((typeMap) =>
        Object.entries(typeMap as Record<string, Track>)
          .filter(([id]) => id === trackId)
          .map(([, t]) => t)
      )
    )[0];
    const merged = { ...(existing ?? {}), ...track };
    return api
      .patch<any>(`/api/campaigns/${campaignId}/tracks/${trackId}`, { dataJson: merged })
      .then(() => {
        set((store) => {
          if (existing) {
            store.campaigns.currentCampaign.tracks.trackMap[
              existing.status
            ][existing.type][trackId] = merged as any;
          }
        });
      });
  },

  updateCharacterTrack: (characterId, trackId, track) => {
    const existingState = getState();
    const allCharTracks = existingState.campaigns.currentCampaign.characters.characterTracks[characterId];
    const existing = allCharTracks
      ? Object.values(allCharTracks).flatMap((typeMap: any) =>
          Object.entries(typeMap as Record<string, Track>)
            .filter(([id]) => id === trackId)
            .map(([, t]) => t)
        )[0]
      : undefined;
    const merged = { ...(existing ?? {}), ...track };
    return api.patch<void>(`/api/characters/${characterId}/tracks/${trackId}`, { dataJson: merged });
  },

  deleteTrack: (trackId) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    return api.del<void>(`/api/campaigns/${campaignId}/tracks/${trackId}`).then(() => {
      set((store) => {
        Object.values(TrackStatus).forEach((status) => {
          Object.values(store.campaigns.currentCampaign.tracks.trackMap[status]).forEach(
            (typeMap: any) => {
              delete typeMap[trackId];
            }
          );
        });
      });
    });
  },

  setLoadCompletedTracks: () => {
    set((store) => {
      store.campaigns.currentCampaign.tracks.loadCompletedTracks = true;
    });
  },

  resetStore: () => {
    set((store) => {
      store.campaigns.currentCampaign.tracks = {
        ...store.campaigns.currentCampaign.tracks,
        ...defaultCampaignTracksSlice,
      };
    });
  },
});
