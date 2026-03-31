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
import { PayThePriceSection } from "./PayThePriceSection";

const FINISH_AN_EXPEDITION_MOVE_ID =
  "starforged/moves/exploration/finish_an_expedition";
const FINISH_AN_EXPEDITION_MOVE_NAME = "Finish an Expedition";

type MissChoice = "abandon" | "return";

export interface FinishAnExpeditionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FinishAnExpeditionDialog({
  open,
  onClose,
}: FinishAnExpeditionDialogProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [rollResult, setRollResult] = useState<ROLL_RESULT | undefined>();
  const [missChoice, setMissChoice] = useState<MissChoice>("abandon");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [oracleResult, setOracleResult] = useState<
    { label: string; result: string } | undefined
  >();
  const [confirming, setConfirming] = useState(false);

  const { rollTrackProgress } = useRoller();
  const logMoveEvent = useStore((s) => s.sessionLog.logMoveEvent);
  const logProgressEvent = useStore((s) => s.sessionLog.logProgressEvent);

  const updateCharacterTrack = useStore(
    (s) => s.characters.currentCharacter.tracks.updateTrack
  );
  const updateCampaignTrack = useStore(
    (s) => s.campaigns.currentCampaign.tracks.updateTrack
  );

  const { tracks, getBoxes } = useJourneyTracks();

  const selectedEntry: JourneyTrackEntry | undefined = tracks.find(
    (t) => t.id === selectedTrackId
  );

  const progressBoxes = selectedEntry
    ? Math.floor(selectedEntry.track.value / 4)
    : 0;

  const handleRoll = () => {
    if (!selectedEntry) return;
    const result = rollTrackProgress(
      TrackTypes.Journey,
      selectedEntry.track.label,
      progressBoxes,
      FINISH_AN_EXPEDITION_MOVE_ID
    );
    setRollResult(result);
  };

  const handleConfirm = async () => {
    if (!selectedEntry || rollResult === undefined) return;
    setConfirming(true);
    try {
      const contextParts: string[] = [];
      if (missChoice === "abandon" && rollResult === ROLL_RESULT.MISS) {
        contextParts.push("Chose: Abandon the expedition");
      } else if (missChoice === "return" && rollResult === ROLL_RESULT.MISS) {
        contextParts.push("Chose: Return to the expedition — clearing progress and raising rank");
      }
      if (oracleResult) contextParts.push(oracleResult.label + ": " + oracleResult.result);
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMoveEvent({
        moveName: FINISH_AN_EXPEDITION_MOVE_NAME,
        moveId: FINISH_AN_EXPEDITION_MOVE_ID,
        playerContext: contextParts.join("\n") || undefined,
        outcome: rollResult,
      });

      if (rollResult === ROLL_RESULT.MISS && missChoice === "return") {
        // Roll both challenge dice, take lowest, clear that many progress boxes
        const die1 = Math.floor(Math.random() * 10) + 1;
        const die2 = Math.floor(Math.random() * 10) + 1;
        const boxesToClear = Math.min(die1, die2);
        const newBoxes = Math.max(0, progressBoxes - boxesToClear);
        const newValue = newBoxes * 4;
        const prevValue = selectedEntry.track.value;
        if (selectedEntry.source === "campaign") {
          await updateCampaignTrack(selectedEntry.id, { value: newValue });
        } else {
          await updateCharacterTrack(selectedEntry.id, { value: newValue });
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
    setMissChoice("abandon");
    setOutcomeDescription("");
    setOracleResult(undefined);
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
      <DialogTitle>Finish an Expedition</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          When your expedition comes to an end, roll the progress for the
          expedition track.
        </Typography>

        <Box mb={2}>
          {tracks.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No active expeditions found.
            </Typography>
          ) : (
            <FormControl size="small" fullWidth>
              <InputLabel>Expedition</InputLabel>
              <Select
                label="Expedition"
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
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>You reach your destination!</strong> Mark a legacy
                reward on your discoveries track per the expedition&apos;s rank:
                <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                  <li>Troublesome: 1 tick</li>
                  <li>Dangerous: 2 ticks</li>
                  <li>Formidable: 1 box</li>
                  <li>Extreme: 2 boxes</li>
                  <li>Epic: 3 boxes</li>
                </Box>
              </Alert>
            )}

            {rollResult === ROLL_RESULT.WEAK_HIT && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>You arrive, but face an unforeseen complication.</strong>{" "}
                Mark a legacy reward one rank lower than normal, and envision
                what you encounter.
              </Alert>
            )}

            {rollResult === ROLL_RESULT.MISS && (
              <Box mb={2}>
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  Your destination is lost to you, or you face the true cost of
                  the expedition. Choose one:
                </Alert>
                <RadioGroup
                  value={missChoice}
                  onChange={(e) => setMissChoice(e.target.value as MissChoice)}
                >
                  <FormControlLabel
                    value="abandon"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Abandon the expedition — envision the cost and Pay the
                        Price
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="return"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Return to the expedition — roll both challenge dice, take
                        the lowest value, and clear that many progress boxes;
                        raise the rank by one
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollResult === ROLL_RESULT.MISS && missChoice === "abandon" && (
              <Box mb={2}>
                <PayThePriceSection
                  missText="Pay the Price for abandoning the expedition."
                  oracleResult={oracleResult}
                  onOracleResult={setOracleResult}
                />
              </Box>
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
                ? "Describe the complication you face (optional):"
                : "Describe what happens (optional):"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollResult === ROLL_RESULT.HIT
                  ? "What do you find at your destination?"
                  : rollResult === ROLL_RESULT.WEAK_HIT
                  ? "What complication awaits you?"
                  : "What is the cost or consequence?"
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
