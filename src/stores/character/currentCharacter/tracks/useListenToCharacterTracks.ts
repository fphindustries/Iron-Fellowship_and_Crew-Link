import { useEffect } from "react";
import { useStore } from "stores/store";
import { useCharacterTracksQuery } from "hooks/queries/useCharactersQuery";
import { TrackStatus, TrackTypes, Track } from "types/Track.type";

function buildEmptyTrackMap() {
  return {
    [TrackStatus.Active]: {
      [TrackTypes.Fray]: {} as Record<string, Track>,
      [TrackTypes.Journey]: {} as Record<string, Track>,
      [TrackTypes.Vow]: {} as Record<string, Track>,
      [TrackTypes.BondProgress]: {} as Record<string, Track>,
      [TrackTypes.SceneChallenge]: {} as Record<string, Track>,
      [TrackTypes.Clock]: {} as Record<string, Track>,
    },
    [TrackStatus.Completed]: {
      [TrackTypes.Fray]: {} as Record<string, Track>,
      [TrackTypes.Journey]: {} as Record<string, Track>,
      [TrackTypes.Vow]: {} as Record<string, Track>,
      [TrackTypes.BondProgress]: {} as Record<string, Track>,
      [TrackTypes.SceneChallenge]: {} as Record<string, Track>,
      [TrackTypes.Clock]: {} as Record<string, Track>,
    },
  };
}

export function useListenToCharacterTracks() {
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const { data: trackRows } = useCharacterTracksQuery(characterId);

  useEffect(() => {
    if (!trackRows) return;
    const trackMap = buildEmptyTrackMap();
    trackRows.forEach((row) => {
      const data = row.dataJson ?? {};
      const track: Track = {
        ...data,
        createdDate: row.createdAt ? new Date(row.createdAt) : new Date(),
      };
      const status: TrackStatus = track.status ?? TrackStatus.Active;
      const type: TrackTypes = track.type;
      if (trackMap[status] && trackMap[status][type]) {
        (trackMap[status][type] as Record<string, Track>)[row.id] = track;
      }
    });
    useStore.setState((store) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store.characters.currentCharacter.tracks.trackMap = trackMap as any;
      store.characters.currentCharacter.tracks.loading = false;
    });
  }, [trackRows]);
}
