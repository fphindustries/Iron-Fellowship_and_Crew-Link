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
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { useStore } from "stores/store";
import { ROLL_RESULT } from "types/DieRolls.type";
import { TrackTypes } from "types/Track.type";
import { useRoller } from "stores/appState/useRoller";
import { useCombatTracker } from "hooks/useCombatTracker";

const TAKE_DECISIVE_ACTION_MOVE_ID =
  "starforged/moves/combat/take_decisive_action";
const TAKE_DECISIVE_ACTION_MOVE_NAME = "Take Decisive Action";

type MissChoice = "face_defeat" | "pay_cost";

export interface TakeDecisiveActionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TakeDecisiveActionDialog({
  open,
  onClose,
}: TakeDecisiveActionDialogProps) {
  const [rollResult, setRollResult] = useState<ROLL_RESULT | undefined>();
  const [weakHitCost, setWeakHitCost] = useState("");
  const [missChoice, setMissChoice] = useState<MissChoice>("face_defeat");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [confirming, setConfirming] = useState(false);

  const { rollTrackProgress } = useRoller();
  const logMoveEvent = useStore((s) => s.sessionLog.logMoveEvent);
  const { activeCombat, frayTrack, endCombat, setPosition } = useCombatTracker();

  const progressBoxes = frayTrack ? Math.floor(frayTrack.value / 4) : 0;

  const handleRoll = () => {
    const result = rollTrackProgress(
      TrackTypes.Journey,
      activeCombat?.objective ?? "Combat",
      progressBoxes,
      TAKE_DECISIVE_ACTION_MOVE_ID
    );
    setRollResult(result);
  };

  const handleConfirm = async () => {
    if (rollResult === undefined) return;
    setConfirming(true);
    try {
      const contextParts: string[] = [];
      if (rollResult === ROLL_RESULT.WEAK_HIT && weakHitCost.trim()) {
        contextParts.push(`Cost: ${weakHitCost.trim()}`);
      }
      if (rollResult === ROLL_RESULT.MISS) {
        contextParts.push(
          missChoice === "face_defeat"
            ? "Chose: Face Defeat"
            : "Chose: Pay a cost to continue — shifted to In a Bad Spot"
        );
      }
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMoveEvent({
        moveName: TAKE_DECISIVE_ACTION_MOVE_NAME,
        moveId: TAKE_DECISIVE_ACTION_MOVE_ID,
        playerContext: contextParts.join("\n") || undefined,
        outcome: rollResult,
      });

      if (rollResult === ROLL_RESULT.HIT || rollResult === ROLL_RESULT.WEAK_HIT) {
        await endCombat(rollResult, outcomeDescription.trim() || undefined);
      } else if (rollResult === ROLL_RESULT.MISS && missChoice === "pay_cost") {
        await setPosition("in_a_bad_spot");
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
    setRollResult(undefined);
    setWeakHitCost("");
    setMissChoice("face_defeat");
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
      <DialogTitle>Take Decisive Action</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          When you make your move to bring this fight to an end, roll your
          progress.
        </Typography>

        {rollResult === undefined && (
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Combat progress: {progressBoxes} / 10 boxes
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progressBoxes * 10}
              sx={{ mb: 2, height: 8, borderRadius: 1 }}
            />
            <Button variant="outlined" onClick={handleRoll}>
              Roll Progress ({progressBoxes} boxes)
            </Button>
          </Box>
        )}

        {rollResult !== undefined && (
          <Box>
            {rollResult === ROLL_RESULT.HIT && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>You finish them.</strong> The fight is over. Describe
                the conclusion and mark any relevant legacy rewards.
              </Alert>
            )}

            {rollResult === ROLL_RESULT.WEAK_HIT && (
              <Box mb={2}>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  <strong>You prevail, but at a cost.</strong> The fight ends.
                  Envision what it costs you to finish it.
                </Alert>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="What do you sacrifice or suffer to end the fight?"
                  value={weakHitCost}
                  onChange={(e) => setWeakHitCost(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </Box>
            )}

            {rollResult === ROLL_RESULT.MISS && (
              <Box mb={2}>
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  <strong>You cannot finish the fight on your terms.</strong>{" "}
                  Choose one:
                </Alert>
                <RadioGroup
                  value={missChoice}
                  onChange={(e) => setMissChoice(e.target.value as MissChoice)}
                >
                  <FormControlLabel
                    value="face_defeat"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Face Defeat — the fight ends badly for you
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="pay_cost"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Pay a cost to continue — shift to{" "}
                        <strong>In a Bad Spot</strong> and fight on
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Describe the outcome (optional):
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollResult === ROLL_RESULT.HIT
                  ? "How does the fight end?"
                  : rollResult === ROLL_RESULT.WEAK_HIT
                  ? "How do you win, and what does it cost?"
                  : "What happens when you fail to finish it?"
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
