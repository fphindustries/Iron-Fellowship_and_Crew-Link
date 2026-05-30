import { Button, Checkbox, FormControlLabel } from "@mui/material";
import { TrackSectionProgressTracks, TrackTypes } from "types/Track.type";
import { EditOrCreateTrackDialog } from "./EditOrCreateTrackDialog";
import { SectionHeading } from "components/shared/SectionHeading";
import { useState } from "react";
import { useStore } from "stores/store";
import { ProgressTracks } from "./ProgressTracks";
import { useUpdateCampaignTrackMutation } from "hooks/queries/useCampaignsQuery";
import { useUpdateCharacterTrackMutation } from "hooks/queries/useCharactersQuery";

export interface ProgressTrackListProps {
  trackType: TrackSectionProgressTracks | TrackTypes.SceneChallenge;
  typeLabel: string;
  headingBreakContainer?: boolean;
  readOnly?: boolean;
  isCampaign?: boolean;
}

export function ProgressTrackList(props: ProgressTrackListProps) {
  const { trackType, typeLabel, headingBreakContainer, readOnly, isCampaign } =
    props;

  const setLoadCompletedTracks = useStore((store) =>
    isCampaign
      ? store.campaigns.currentCampaign.tracks.setLoadCompletedTracks
      : store.characters.currentCharacter.tracks.setLoadCompletedTracks
  );
  const [showCompletedTracks, setShowCompletedTracks] = useState(false);
  const toggleShowCompletedTracks = (value: boolean) => {
    if (value) {
      setLoadCompletedTracks();
    }
    setShowCompletedTracks(value);
  };

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

      <SectionHeading
        label={`${typeLabel}s`}
        action={
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showCompletedTracks}
                  onChange={(evt, checked) =>
                    toggleShowCompletedTracks(checked)
                  }
                />
              }
              label={`Show Completed ${typeLabel}s`}
            />
            {!readOnly && (
              <Button
                color={"inherit"}
                onClick={() => setAddTrackDialogOpen(true)}
              >
                Add {typeLabel}
              </Button>
            )}
          </>
        }
        breakContainer={headingBreakContainer}
      />
      <ProgressTracks
        isCampaign={isCampaign}
        trackType={trackType}
        typeLabel={typeLabel}
        headingBreakContainer={headingBreakContainer}
        readOnly={readOnly}
      />
      {showCompletedTracks && (
        <ProgressTracks
          isCampaign={isCampaign}
          isCompleted
          trackType={trackType}
          typeLabel={typeLabel}
          headingBreakContainer={headingBreakContainer}
          readOnly={readOnly}
        />
      )}
    </>
  );
}
