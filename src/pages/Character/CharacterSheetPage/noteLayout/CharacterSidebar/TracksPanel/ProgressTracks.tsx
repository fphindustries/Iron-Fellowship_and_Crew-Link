import { Divider, Stack } from "@mui/material";
import { useState } from "react";
import { useStore } from "stores/store";
import {
  SceneChallenge,
  Track,
  TrackSectionProgressTracks,
  TrackStatus,
  TrackTypes,
} from "types/Track.type";
import { ProgressTrack } from "./ProgressTrack";
import { EmptyState } from "components/shared/EmptyState";
import { EditOrCreateTrackDialog } from "components/features/ProgressTrack";
import { ignoreApiError } from "config/api.config";
import { useUpdateCampaignTrackMutation } from "hooks/queries/useCampaignsQuery";
import { useUpdateCharacterTrackMutation } from "hooks/queries/useCharactersQuery";

export interface ProgressTracksProps {
  isCampaign?: boolean;
  isCompleted?: boolean;
  trackType: TrackSectionProgressTracks | TrackTypes.SceneChallenge;
  typeLabel: string;
  readOnly?: boolean;
}

export function ProgressTracks(props: ProgressTracksProps) {
  const { isCampaign, isCompleted, trackType, typeLabel, readOnly } = props;

  const tracks = useStore((store) =>
    isCampaign
      ? store.campaigns.currentCampaign.tracks.trackMap[
          isCompleted ? TrackStatus.Completed : TrackStatus.Active
        ][trackType]
      : store.characters.currentCharacter.tracks.trackMap[
          isCompleted ? TrackStatus.Completed : TrackStatus.Active
        ][trackType]
  );
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const logProgressEvent = useStore(
    (store) => store.sessionLog.logProgressEvent
  );

  const orderedTrackIds = Object.keys(tracks).sort((trackId1, trackId2) => {
    const track1 = tracks[trackId1];
    const track2 = tracks[trackId2];

    return track2.createdDate.getTime() - track1.createdDate.getTime();
  });

  const [currentlyEditingTrackId, setCurrentlyEditingTrackId] =
    useState<string>();

  const currentlyEditingTrack =
    currentlyEditingTrackId && tracks
      ? tracks[currentlyEditingTrackId]
      : undefined;

  const updateCampaignProgressTrack =
    useUpdateCampaignTrackMutation(campaignId);
  const updateCharacterProgressTrack =
    useUpdateCharacterTrackMutation(characterId);

  const updateProgressTrack = (trackId: string, track: Partial<Track>) => {
    const existingTrack = tracks[trackId];
    if (track.value !== undefined && existingTrack) {
      logProgressEvent({
        trackName: existingTrack.label,
        trackType: existingTrack.type,
        previousValue: existingTrack.value,
        newValue: track.value,
      });
    }

    const dataJson = { ...(existingTrack ?? {}), ...track };
    const mutation = isCampaign
      ? updateCampaignProgressTrack
      : updateCharacterProgressTrack;
    return mutation.mutateAsync({ trackId, dataJson });
  };

  const completeProgressTrack = (trackId: string) => {
    updateProgressTrack(trackId, { status: TrackStatus.Completed }).catch(
      () => {}
    );
  };

  const updateProgressTrackValue = (trackId: string, value: number) => {
    updateProgressTrack(trackId, { value }).catch(ignoreApiError);
  };

  const updateSceneChallengeValue = (
    trackId: string,
    segmentsFilled: number
  ) => {
    updateProgressTrack(trackId, { segmentsFilled }).catch(ignoreApiError);
  };

  const deleteProgressTrack = (trackId: string) => {
    const mutation = isCampaign
      ? updateCampaignProgressTrack
      : updateCharacterProgressTrack;
    return mutation.mutateAsync({ trackId, remove: true });
  };

  return (
    <>
      <Stack mt={2} spacing={4} mb={4}>
        {isCompleted && <Divider>Completed Tracks</Divider>}
        {Array.isArray(orderedTrackIds) && orderedTrackIds.length > 0 ? (
          orderedTrackIds.map((trackId, index) => (
            <ProgressTrack
              key={index}
              status={tracks[trackId].status}
              label={tracks[trackId].label}
              description={tracks[trackId].description}
              difficulty={tracks[trackId].difficulty}
              value={tracks[trackId].value}
              max={40}
              onValueChange={
                readOnly || isCompleted
                  ? undefined
                  : (value) => updateProgressTrackValue(trackId, value)
              }
              onComplete={
                readOnly || isCompleted
                  ? undefined
                  : () => completeProgressTrack(trackId)
              }
              onEdit={
                readOnly || isCompleted
                  ? undefined
                  : () => setCurrentlyEditingTrackId(trackId)
              }
              onDelete={
                readOnly ? undefined : () => deleteProgressTrack(trackId)
              }
              hideRollButton={readOnly || isCompleted}
              {...(trackType === TrackTypes.SceneChallenge
                ? {
                    sceneChallenge: {
                      filledSegments: (tracks[trackId] as SceneChallenge)
                        .segmentsFilled,
                      onChange:
                        readOnly || isCompleted
                          ? undefined
                          : (newFilledSegments: number) =>
                              updateSceneChallengeValue(
                                trackId,
                                newFilledSegments
                              ),
                    },
                    trackType: TrackTypes.SceneChallenge,
                  }
                : { trackType })}
            />
          ))
        ) : (
          <EmptyState
            message={`No ${isCompleted ? "Completed " : ""}${typeLabel}s found`}
          />
        )}
      </Stack>
      {!readOnly && currentlyEditingTrack && currentlyEditingTrackId && (
        <EditOrCreateTrackDialog
          open={!!currentlyEditingTrack}
          handleClose={() => setCurrentlyEditingTrackId(undefined)}
          trackType={currentlyEditingTrack.type as TrackSectionProgressTracks}
          trackTypeName={`${typeLabel}`}
          initialTrack={currentlyEditingTrack}
          handleTrack={(track) =>
            currentlyEditingTrack
              ? updateProgressTrack(currentlyEditingTrackId, track)
              : new Promise((res) => res(true))
          }
        />
      )}
    </>
  );
}
