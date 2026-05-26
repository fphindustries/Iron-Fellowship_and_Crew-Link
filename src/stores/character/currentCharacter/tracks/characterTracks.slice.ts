import { CreateSliceType } from "stores/store.type";
import { CharacterTracksSlice } from "./characterTracks.slice.type";
import { defaultCharacterTracksSlice } from "./characterTracks.slice.default";
import { TrackStatus, TrackTypes, Track } from "types/Track.type";
import { api } from "config/api.config";

function toTrack(row: any): Track {
  const data = row.dataJson ?? {};
  return {
    ...data,
    createdDate: row.createdAt ? new Date(row.createdAt) : new Date(),
  } as Track;
}

export const createCharacterTracksSlice: CreateSliceType<
  CharacterTracksSlice
> = (set, getState) => ({
  ...defaultCharacterTracksSlice,

  subscribe: (_characterId, _status) => {
    // Data is now fetched by useCharacterTracksQuery via useListenToCharacterTracks.
    return () => {};
  },

  addTrack: (track) => {
    const characterId = getState().characters.currentCharacter.currentCharacterId;
    const { createdDate, ...rest } = track as any;
    return api
      .post<any>(`/api/characters/${characterId}/tracks`, {
        dataJson: rest,
        createdAt: (createdDate ?? new Date()).toISOString(),
      })
      .then((row) => {
        const saved = toTrack(row);
        set((store) => {
          store.characters.currentCharacter.tracks.trackMap[
            saved.status
          ][saved.type][row.id] = saved as any;
        });
      });
  },

  updateTrack: (trackId, track) => {
    const state = getState();
    const characterId = state.characters.currentCharacter.currentCharacterId;
    const existing = Object.values(TrackStatus).flatMap((status) =>
      Object.values(state.characters.currentCharacter.tracks.trackMap[status]).flatMap((typeMap) =>
        Object.entries(typeMap as Record<string, Track>)
          .filter(([id]) => id === trackId)
          .map(([, t]) => t)
      )
    )[0];
    if (track.value !== undefined && existing) {
      const trackTypes = [
        TrackTypes.Fray,
        TrackTypes.Journey,
        TrackTypes.Vow,
        TrackTypes.SceneChallenge,
        TrackTypes.Clock,
      ] as const;
      const activeTrackMap = state.characters.currentCharacter.tracks.trackMap[TrackStatus.Active];
      let foundTrack: { label: string; value: number; type: string } | undefined;
      for (const type of trackTypes) {
        const t = activeTrackMap[type][trackId];
        if (t) { foundTrack = t; break; }
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
    const merged = { ...(existing ?? {}), ...track };
    return api
      .patch<any>(`/api/characters/${characterId}/tracks/${trackId}`, { dataJson: merged })
      .then(() => {
        set((store) => {
          if (existing) {
            store.characters.currentCharacter.tracks.trackMap[
              existing.status
            ][existing.type][trackId] = merged as any;
          }
        });
      });
  },

  deleteTrack: (trackId) => {
    const characterId = getState().characters.currentCharacter.currentCharacterId;
    return api.del<void>(`/api/characters/${characterId}/tracks/${trackId}`).then(() => {
      set((store) => {
        Object.values(TrackStatus).forEach((status) => {
          Object.values(store.characters.currentCharacter.tracks.trackMap[status]).forEach(
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
