import { CreateSliceType } from "stores/store.type";
import { CampaignTracksSlice } from "./campaignTracks.slice.type";
import { defaultCampaignTracksSlice } from "./campaignTracks.slice.default";
import { listenToProgressTracks } from "api-calls/tracks/listenToProgressTracks";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { addProgressTrack } from "api-calls/tracks/addProgressTrack";
import { updateProgressTrack } from "api-calls/tracks/updateProgressTrack";
import { removeProgressTrack } from "api-calls/tracks/removeProgressTrack";

export const createCampaignTracksSlice: CreateSliceType<CampaignTracksSlice> = (
  set,
  getState
) => ({
  ...defaultCampaignTracksSlice,

  subscribe: (campaignId, status = TrackStatus.Active) => {
    const unsubscribe = listenToProgressTracks(
      campaignId,
      undefined,
      status,
      (tracks) => {
        set((store) => {
          Object.keys(tracks).forEach((trackId) => {
            const track = tracks[trackId];
            store.campaigns.currentCampaign.tracks.trackMap[status][track.type][
              trackId
            ] = track;
          });
        });
      },
      (trackId, type) => {
        set((store) => {
          delete store.campaigns.currentCampaign.tracks.trackMap[status][type][
            trackId
          ];
        });
      },
      (error) => {
        console.error(error);
      }
    );

    if (!unsubscribe) {
      return () => {};
    }
    return unsubscribe;
  },

  addTrack: (track) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    return addProgressTrack({ campaignId, track });
  },
  updateTrack: (trackId, track) => {
    const state = getState();
    const campaignId = state.campaigns.currentCampaign.currentCampaignId;

    if (track.value !== undefined) {
      const activeTrackMap =
        state.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active];
      const trackTypes = [
        TrackTypes.Fray,
        TrackTypes.Journey,
        TrackTypes.Vow,
        TrackTypes.SceneChallenge,
        TrackTypes.Clock,
      ] as const;
      let foundTrack: { label: string; value: number; type: string } | undefined;
      for (const type of trackTypes) {
        const t = activeTrackMap[type][trackId];
        if (t) {
          foundTrack = t;
          break;
        }
      }
      if (foundTrack) {
        state.sessionLog.logProgressEvent({
          trackName: foundTrack.label,
          trackType: foundTrack.type,
          previousValue: foundTrack.value,
          newValue: track.value,
        });
      }
    }

    return updateProgressTrack({ campaignId, trackId, track });
  },
  deleteTrack: (trackId) => {
    const campaignId = getState().campaigns.currentCampaign.currentCampaignId;
    return removeProgressTrack({ campaignId, id: trackId });
  },

  updateCharacterTrack: (characterId, trackId, track) => {
    return updateProgressTrack({ characterId, trackId, track });
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
