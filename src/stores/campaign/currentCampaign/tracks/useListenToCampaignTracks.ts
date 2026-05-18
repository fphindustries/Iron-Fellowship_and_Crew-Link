import { useEffect } from "react";
import { useStore } from "stores/store";
import { useCampaignTracksQuery } from "hooks/queries/useCampaignsQuery";
import { TrackStatus, TrackTypes, Track } from "types/Track.type";

export function useListenToCampaignTracks() {
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const { data: trackRows } = useCampaignTracksQuery(campaignId);

  useEffect(() => {
    if (!trackRows) return;
    const trackMap = {
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
    trackRows.forEach((row) => {
      const track: Track = {
        ...(row.dataJson ?? {}),
        createdDate: row.createdAt ? new Date(row.createdAt) : new Date(),
      };
      const status: TrackStatus = track.status ?? TrackStatus.Active;
      const type: TrackTypes = track.type;
      if (trackMap[status]?.[type]) {
        (trackMap[status][type] as Record<string, Track>)[row.id] = track;
      }
    });
    useStore.setState((store) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      store.campaigns.currentCampaign.tracks.trackMap = trackMap as any;
      store.campaigns.currentCampaign.tracks.loading = false;
    });
  }, [trackRows]);
}
