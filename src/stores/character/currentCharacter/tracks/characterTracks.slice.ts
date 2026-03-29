import { CreateSliceType } from "stores/store.type";
import { CharacterTracksSlice } from "./characterTracks.slice.type";
import { defaultCharacterTracksSlice } from "./characterTracks.slice.default";
import { listenToProgressTracks } from "api-calls/tracks/listenToProgressTracks";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { addProgressTrack } from "api-calls/tracks/addProgressTrack";
import { updateProgressTrack } from "api-calls/tracks/updateProgressTrack";
import { removeProgressTrack } from "api-calls/tracks/removeProgressTrack";

export const createCharacterTracksSlice: CreateSliceType<
  CharacterTracksSlice
> = (set, getState) => ({
  ...defaultCharacterTracksSlice,

  subscribe: (characterId, status = TrackStatus.Active) => {
    const unsubscribe = listenToProgressTracks(
      undefined,
      characterId,
      status,
      (tracks) => {
        set((store) => {
          Object.keys(tracks).forEach((trackId) => {
            const track = tracks[trackId];
            store.characters.currentCharacter.tracks.trackMap[status][
              track.type
            ][trackId] = track;
          });
        });
      },
      (trackId, type) => {
        set((store) => {
          delete store.characters.currentCharacter.tracks.trackMap[status][
            type
          ][trackId];
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
    const characterId =
      getState().characters.currentCharacter.currentCharacterId;
    return addProgressTrack({ characterId, track });
  },
  updateTrack: (trackId, track) => {
    const state = getState();
    const characterId = state.characters.currentCharacter.currentCharacterId;

    if (track.value !== undefined) {
      const activeTrackMap =
        state.characters.currentCharacter.tracks.trackMap[TrackStatus.Active];
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

    return updateProgressTrack({ characterId, trackId, track });
  },
  deleteTrack: (trackId) => {
    const characterId =
      getState().characters.currentCharacter.currentCharacterId;
    return removeProgressTrack({ characterId, id: trackId });
  },

  setLoadCompletedTracks: () => {
    set((store) => {
      store.characters.currentCharacter.tracks.loadCompletedTracks = true;
    });
  },

  resetStore: () => {
    set((store) => {
      store.characters.currentCharacter.tracks = {
        ...store.characters.currentCharacter.tracks,
        ...defaultCharacterTracksSlice,
      };
    });
  },
});
