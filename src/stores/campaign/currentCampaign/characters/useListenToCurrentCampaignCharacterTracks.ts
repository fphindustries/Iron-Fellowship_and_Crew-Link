import { useEffect } from "react";
import { useStore } from "stores/store";
import { useCampaignCharacterTracksQueries } from "hooks/queries/useCampaignsQuery";
import { Clock, ProgressTrack, SceneChallenge, TrackTypes } from "types/Track.type";

type CampaignCharTrackMap = {
  [TrackTypes.Fray]: Record<string, ProgressTrack>;
  [TrackTypes.Journey]: Record<string, ProgressTrack>;
  [TrackTypes.Vow]: Record<string, ProgressTrack>;
  [TrackTypes.SceneChallenge]: Record<string, SceneChallenge>;
  [TrackTypes.Clock]: Record<string, Clock>;
};

export function useListenToCurrentCampaignCharacterTracks() {
  const characterIds = useStore(
    (store) =>
      store.campaigns.currentCampaign.currentCampaign?.characters.map(
        (c) => c.characterId
      ) ?? []
  );

  const results = useCampaignCharacterTracksQueries(characterIds);

  useEffect(() => {
    let hasData = false;
    const updates: Array<{ characterId: string; trackMap: CampaignCharTrackMap }> = [];
    results.forEach((result, i) => {
      if (!result.data) return;
      hasData = true;
      const trackMap: CampaignCharTrackMap = {
        [TrackTypes.Fray]: {},
        [TrackTypes.Journey]: {},
        [TrackTypes.Vow]: {},
        [TrackTypes.SceneChallenge]: {},
        [TrackTypes.Clock]: {},
      };
      result.data.forEach((row) => {
        const track = { ...(row.dataJson ?? {}), createdDate: row.createdAt ? new Date(row.createdAt) : new Date() };
        const type: TrackTypes = track.type;
        if (type in trackMap) {
          (trackMap[type as keyof CampaignCharTrackMap] as Record<string, unknown>)[row.id] = track;
        }
      });
      updates.push({ characterId: characterIds[i], trackMap });
    });
    if (!hasData) return;
    useStore.setState((store) => {
      updates.forEach(({ characterId, trackMap }) => {
        store.campaigns.currentCampaign.characters.characterTracks[characterId] = trackMap;
      });
    });
  }, [results, characterIds]);
}
