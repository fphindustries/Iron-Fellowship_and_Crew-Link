import { Button } from "@mui/material";
import { TrackSectionProgressTracks, TrackTypes } from "types/Track.type";
import { useEffect, useState } from "react";
import { useStore } from "stores/store";
import { ProgressTracks } from "./ProgressTracks";
import { EditOrCreateTrackDialog } from "components/features/ProgressTrack";
import { SidebarHeading } from "./SidebarHeading";
import { useUpdateCampaignTrackMutation } from "hooks/queries/useCampaignsQuery";
import { useUpdateCharacterTrackMutation } from "hooks/queries/useCharactersQuery";

export interface ProgressTrackListProps {
  trackType: TrackSectionProgressTracks | TrackTypes.SceneChallenge;
  typeLabel: string;
  readOnly?: boolean;
  isCampaign?: boolean;
  showCompletedTracks?: boolean;
}

export function ProgressTrackList(props: ProgressTrackListProps) {
  const { trackType, typeLabel, readOnly, isCampaign, showCompletedTracks } =
    props;

  const setLoadCompletedTracks = useStore((store) =>
    isCampaign
      ? store.campaigns.currentCampaign.tracks.setLoadCompletedTracks
      : store.characters.currentCharacter.tracks.setLoadCompletedTracks
  );

  useEffect(() => {
    if (showCompletedTracks) {
      setLoadCompletedTracks();
    }
  }, [showCompletedTracks, setLoadCompletedTracks]);

  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const addCampaignProgressTrack = useUpdateCampaignTrackMutation(campaignId);
  const addCharacterProgressTrack = useUpdateCharacterTrackMutation(characterId);

  const [addTrackDialogOpen, setAddTrackDialogOpen] = useState(false);
  return (
    <>
      {!readOnly && (
        <EditOrCreateTrackDialog
          open={addTrackDialogOpen}
          handleClose={() => setAddTrackDialogOpen(false)}
          trackType={trackType}
          trackTypeName={`${typeLabel}`}
          handleTrack={(track) => {
            const { createdDate: _createdDate, ...dataJson } = track;
            if (isCampaign) {
              return addCampaignProgressTrack.mutateAsync({
                type: track.type,
                dataJson,
              });
            } else {
              return addCharacterProgressTrack.mutateAsync({
                type: track.type,
                dataJson,
              });
            }
          }}
        />
      )}

      <SidebarHeading
        label={`${typeLabel}s`}
        action={
          !readOnly && (
            <Button
              color={"inherit"}
              onClick={() => setAddTrackDialogOpen(true)}
            >
              Add {typeLabel}
            </Button>
          )
        }
      />
      <ProgressTracks
        isCampaign={isCampaign}
        trackType={trackType}
        typeLabel={typeLabel}
        readOnly={readOnly}
      />
      {showCompletedTracks && (
        <ProgressTracks
          isCampaign={isCampaign}
          isCompleted
          trackType={trackType}
          typeLabel={typeLabel}
          readOnly={readOnly}
        />
      )}
    </>
  );
}
