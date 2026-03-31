import { useMemo } from "react";
import { useStore } from "stores/store";
import { Difficulty, ProgressTrack, TrackStatus, TrackTypes } from "types/Track.type";
import { getDifficultyStep } from "functions/moveUtils";

export interface JourneyTrackEntry {
  id: string;
  track: ProgressTrack;
  source: "character" | "campaign";
}

/**
 * Returns all active journey/expedition tracks from character and campaign,
 * plus helpers for marking progress on a selected track.
 */
export function useJourneyTracks() {
  const isInCampaign = useStore(
    (s) => !!s.characters.currentCharacter.currentCharacter?.campaignId
  );
  const characterTrackMap = useStore(
    (s) =>
      s.characters.currentCharacter.tracks.trackMap[TrackStatus.Active][
        TrackTypes.Journey
      ]
  );
  const campaignTrackMap = useStore(
    (s) =>
      s.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active][
        TrackTypes.Journey
      ]
  );

  const updateCharacterTrack = useStore(
    (s) => s.characters.currentCharacter.tracks.updateTrack
  );
  const updateCampaignTrack = useStore(
    (s) => s.campaigns.currentCampaign.tracks.updateTrack
  );

  const logProgressEvent = useStore((s) => s.sessionLog.logProgressEvent);

  const tracks: JourneyTrackEntry[] = useMemo(() => {
    const entries: JourneyTrackEntry[] = [];
    Object.entries(characterTrackMap ?? {}).forEach(([id, track]) => {
      entries.push({ id, track, source: "character" });
    });
    if (isInCampaign) {
      Object.entries(campaignTrackMap ?? {}).forEach(([id, track]) => {
        entries.push({ id, track, source: "campaign" });
      });
    }
    return entries;
  }, [characterTrackMap, campaignTrackMap, isInCampaign]);

  /** Mark progress on a track once per its rank. Returns the new tick value. */
  const markProgress = async (entry: JourneyTrackEntry): Promise<number> => {
    const step = getDifficultyStep(entry.track.difficulty ?? Difficulty.Dangerous);
    const newValue = Math.min(40, entry.track.value + step);
    if (entry.source === "campaign") {
      await updateCampaignTrack(entry.id, { value: newValue });
    } else {
      await updateCharacterTrack(entry.id, { value: newValue });
    }
    logProgressEvent({
      trackName: entry.track.label,
      trackType: TrackTypes.Journey,
      previousValue: entry.track.value,
      newValue,
    });
    return newValue;
  };

  /** Current progress in boxes (0–10) for display. */
  const getBoxes = (entry: JourneyTrackEntry) =>
    Math.floor(entry.track.value / 4);

  return { tracks, markProgress, getBoxes };
}
