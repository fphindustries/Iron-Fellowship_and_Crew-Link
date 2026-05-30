import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useStore } from "stores/store";
import { ROLL_RESULT } from "types/DieRolls.type";
import { TrackTypes } from "types/Track.type";
import { useRoller } from "stores/appState/useRoller";
import { useJourneyTracks, JourneyTrackEntry } from "./useJourneyTracks";
import {
  useUpdateCharacterMutation,
  useUpdateCharacterTrackMutation,
} from "hooks/queries/useCharactersQuery";
import { useUpdateCampaignTrackMutation } from "hooks/queries/useCampaignsQuery";

const REACH_YOUR_DESTINATION_MOVE_ID =
  "classic/moves/adventure/reach_your_destination";
const REACH_YOUR_DESTINATION_MOVE_NAME = "Reach Your Destination";

type StrongHitChoice = "adds" | "momentum";

export interface ReachYourDestinationDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ReachYourDestinationDialog({
  open,
  onClose,
}: ReachYourDestinationDialogProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [rollResult, setRollResult] = useState<ROLL_RESULT | undefined>();
  const [strongHitChoice, setStrongHitChoice] =
    useState<StrongHitChoice>("momentum");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [confirming, setConfirming] = useState(false);

  const { rollTrackProgress } = useRoller();
  const logMoveEvent = useStore((s) => s.sessionLog.logMoveEvent);
  const logStatChangeEvent = useStore((s) => s.sessionLog.logStatChangeEvent);
  const logProgressEvent = useStore((s) => s.sessionLog.logProgressEvent);

  const characterId = useStore(
    (s) => s.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaignId
  );
  const updateCurrentCharacter = useUpdateCharacterMutation(characterId ?? "");
  const updateCharacterTrack = useUpdateCharacterTrackMutation(characterId);
  const updateCampaignTrack = useUpdateCampaignTrackMutation(campaignId);
  const momentum = useStore(
    (s) =>
      s.characters.currentCharacter.currentCharacter?.momentum ?? 0
  );
  const adds = useStore(
    (s) => s.characters.currentCharacter.currentCharacter?.adds ?? 0
  );

  const numberOfDebilities = useStore((s) =>
    Object.values(
      s.characters.currentCharacter.currentCharacter?.debilities ?? {}
    ).filter(Boolean).length
  );
  const maxMomentum = 10 - numberOfDebilities;

  const { tracks, getBoxes } = useJourneyTracks();

  const selectedEntry: JourneyTrackEntry | undefined = tracks.find(
    (t) => t.id === selectedTrackId
  );

  const progressBoxes = selectedEntry
    ? Math.floor(selectedEntry.track.value / 4)
    : 0;

  const newMomentumPreview = Math.min(maxMomentum, momentum + 1);

  const handleRoll = () => {
    if (!selectedEntry) return;
    const result = rollTrackProgress(
      TrackTypes.Journey,
      selectedEntry.track.label,
      progressBoxes,
      REACH_YOUR_DESTINATION_MOVE_ID
    );
    setRollResult(result);
  };

  const handleConfirm = async () => {
    if (!selectedEntry || rollResult === undefined) return;
    setConfirming(true);
    try {
      const contextParts: string[] = [];
      if (strongHitChoice === "adds" && rollResult === ROLL_RESULT.HIT) {
        contextParts.push("Chose: +1 on next move (Adds)");
      } else if (strongHitChoice === "momentum" && rollResult === ROLL_RESULT.HIT) {
        contextParts.push("Chose: +1 Momentum");
      }
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMoveEvent({
        moveName: REACH_YOUR_DESTINATION_MOVE_NAME,
        moveId: REACH_YOUR_DESTINATION_MOVE_ID,
        playerContext: contextParts.join("\n") || undefined,
        outcome: rollResult,
      });

      if (rollResult === ROLL_RESULT.HIT) {
        if (strongHitChoice === "adds") {
          await updateCurrentCharacter.mutateAsync({ adds: adds + 1 });
          logStatChangeEvent({
            stat: "Adds",
            previousValue: adds,
            newValue: adds + 1,
            cause: "Reach Your Destination — Strong Hit",
          });
        } else {
          if (newMomentumPreview !== momentum) {
            await updateCurrentCharacter.mutateAsync({
              momentum: newMomentumPreview,
            });
            logStatChangeEvent({
              stat: "Momentum",
              previousValue: momentum,
              newValue: newMomentumPreview,
              cause: "Reach Your Destination — Strong Hit",
            });
          }
        }
      } else if (rollResult === ROLL_RESULT.MISS) {
        // Clear all but one filled progress box, raise rank by one
        const newValue = 4; // 1 box remaining
        const prevValue = selectedEntry.track.value;
        if (selectedEntry.source === "campaign") {
          await updateCampaignTrack.mutateAsync({
            trackId: selectedEntry.id,
            dataJson: { value: newValue },
          });
        } else {
          await updateCharacterTrack.mutateAsync({
            trackId: selectedEntry.id,
            dataJson: { value: newValue },
          });
        }
        logProgressEvent({
          trackName: selectedEntry.track.label,
          trackType: TrackTypes.Journey,
          previousValue: prevValue,
          newValue,
        });
      }

      handleClose();
    } catch (e) {
      console.error(e);
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    if (confirming) return;
    setSelectedTrackId("");
    setRollResult(undefined);
    setStrongHitChoice("momentum");
    setOutcomeDescription("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={confirming}
    >
      <DialogTitle>Reach Your Destination</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          When your journey is complete, roll the progress for the journey
          track.
        </Typography>

        <Box mb={2}>
          {tracks.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No active journeys found.
            </Typography>
          ) : (
            <FormControl size="small" fullWidth>
              <InputLabel>Journey</InputLabel>
              <Select
                label="Journey"
                value={selectedTrackId}
                onChange={(e) => {
                  setSelectedTrackId(e.target.value);
                  setRollResult(undefined);
                }}
                disabled={rollResult !== undefined}
              >
                {tracks.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.track.label} — {t.track.difficulty}, {getBoxes(t)}/10
                    boxes
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {selectedEntry && rollResult === undefined && (
          <Button
            variant="outlined"
            disabled={!selectedEntry}
            onClick={handleRoll}
          >
            Roll Progress ({progressBoxes} boxes)
          </Button>
        )}

        {rollResult !== undefined && (
          <Box>
            {rollResult === ROLL_RESULT.HIT && (
              <Box mb={2}>
                <Alert severity="success" sx={{ mb: 1.5 }}>
                  The situation at your destination favors you! Choose one:
                </Alert>
                <RadioGroup
                  value={strongHitChoice}
                  onChange={(e) =>
                    setStrongHitChoice(e.target.value as StrongHitChoice)
                  }
                >
                  <FormControlLabel
                    value="momentum"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Take +1 Momentum{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          ({momentum} → {newMomentumPreview})
                        </Typography>
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="adds"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Make another move now (+1 Adds){" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          ({adds} → {adds + 1})
                        </Typography>
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollResult === ROLL_RESULT.WEAK_HIT && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You arrive but face an unforeseen hazard or complication.
                Envision what you find.
              </Alert>
            )}

            {rollResult === ROLL_RESULT.MISS && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>You have gone hopelessly astray.</strong> Your objective
                is lost or you were misled. All but one filled progress box is
                cleared, and the journey&apos;s rank is raised by one (if not already
                epic).
              </Alert>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              {rollResult === ROLL_RESULT.HIT
                ? "Describe your arrival (optional):"
                : rollResult === ROLL_RESULT.WEAK_HIT
                ? "Describe the hazard or complication (optional):"
                : "Describe what went wrong (optional):"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollResult === ROLL_RESULT.HIT
                  ? "What favorable situation greets you?"
                  : rollResult === ROLL_RESULT.WEAK_HIT
                  ? "What unexpected hazard do you encounter?"
                  : "How are you led astray, or what is the true cost?"
              }
              value={outcomeDescription}
              onChange={(e) => setOutcomeDescription(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={confirming}>
          {rollResult === undefined ? "Cancel" : "Back"}
        </Button>
        {rollResult !== undefined && (
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={confirming}
            startIcon={
              confirming ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {confirming ? "Saving…" : "Confirm"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
