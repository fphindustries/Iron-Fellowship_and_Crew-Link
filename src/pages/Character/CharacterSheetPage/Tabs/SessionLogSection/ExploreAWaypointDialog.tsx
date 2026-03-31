import { useMemo, useState } from "react";
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
import { useMoveRoll } from "hooks/useMoveRoll";
import { MomentumBurnAlerts } from "./MomentumBurnAlerts";
import { RollSummaryBox } from "./RollSummaryBox";
import { PayThePriceSection } from "./PayThePriceSection";
import { useJourneyTracks } from "./useJourneyTracks";

const EXPLORE_A_WAYPOINT_MOVE_IDS = [
  "starforged/moves/exploration/explore_a_waypoint",
];

type DialogStep = "setup" | "result";
type StrongHitChoice = "momentum" | "progress";

export interface ExploreAWaypointDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExploreAWaypointDialog({
  open,
  onClose,
}: ExploreAWaypointDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [strongHitChoice, setStrongHitChoice] =
    useState<StrongHitChoice>("momentum");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [oracleResult, setOracleResult] = useState<
    { label: string; result: string } | undefined
  >();
  const [confirming, setConfirming] = useState(false);

  const {
    rollData,
    characterStats,
    momentum,
    momentumResetValue,
    maxMomentum,
    burnOutcome,
    canBurnMomentum,
    currentMomentum,
    updateCurrentCharacter,
    logStatChangeEvent,
    roll,
    burnMomentum,
    applyBurnOnConfirm,
    logMove,
    resetRoll,
  } = useMoveRoll();

  const moveMap = useStore((s) => s.rules.moveMaps.moveMap);
  const statRules = useStore((s) => s.rules.stats);

  const { tracks, markProgress, getBoxes } = useJourneyTracks();

  const move = useMemo(
    () => EXPLORE_A_WAYPOINT_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
    [moveMap]
  );

  const witsValue = characterStats?.["wits"] ?? 0;

  const selectedTrackEntry = tracks.find((t) => t.id === selectedTrackId);
  const newMomentumStrong = Math.min(maxMomentum, currentMomentum + 2);
  const newMomentumWeak = Math.min(maxMomentum, currentMomentum + 1);

  const handleRoll = () => {
    if (!move) return;
    const statLabel = statRules["wits"]?.label ?? "Wits";
    roll("wits", statLabel, move);
    setStep("result");
  };

  const handleConfirm = async () => {
    if (!rollData || !move) return;
    setConfirming(true);
    try {
      await applyBurnOnConfirm(move);
      await logMove(move, playerContext, oracleResult, outcomeDescription);

      if (rollData.outcome === ROLL_RESULT.HIT) {
        if (strongHitChoice === "momentum") {
          if (newMomentumStrong !== currentMomentum) {
            await updateCurrentCharacter({ momentum: newMomentumStrong });
            logStatChangeEvent({
              stat: "Momentum",
              previousValue: currentMomentum,
              newValue: newMomentumStrong,
              cause: "Explore a Waypoint — Find Opportunity",
            });
          }
        } else if (strongHitChoice === "progress" && selectedTrackEntry) {
          await markProgress(selectedTrackEntry);
        }
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        if (newMomentumWeak !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentumWeak });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentumWeak,
            cause: "Explore a Waypoint — Weak Hit",
          });
        }
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
    setStep("setup");
    setPlayerContext("");
    setOutcomeDescription("");
    setStrongHitChoice("momentum");
    setSelectedTrackId("");
    setOracleResult(undefined);
    resetRoll();
    onClose();
  };

  const canConfirmStrong =
    rollData?.outcome !== ROLL_RESULT.HIT ||
    strongHitChoice === "momentum" ||
    (strongHitChoice === "progress" && !!selectedTrackEntry);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={confirming}
    >
      <DialogTitle>Explore a Waypoint</DialogTitle>

      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you divert from your expedition to delve into a waypoint,
              envision your approach and roll +wits.
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              What are you investigating?
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Describe the waypoint and what draws your attention..."
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />

            <Button
              variant="outlined"
              disabled={!playerContext.trim() || !move}
              onClick={handleRoll}
            >
              Roll +Wits ({witsValue >= 0 ? "+" + witsValue : witsValue})
            </Button>
          </Box>
        )}

        {step === "result" && rollData && (
          <Box>
            <RollSummaryBox rollData={rollData} momentum={momentum} />

            <MomentumBurnAlerts
              canBurnMomentum={canBurnMomentum}
              momentum={momentum}
              momentumResetValue={momentumResetValue}
              burnOutcome={burnOutcome}
              momentumBurned={rollData.momentumBurned}
              onBurn={burnMomentum}
            />

            {rollData.outcome === ROLL_RESULT.HIT && (
              <Box mb={2}>
                <Alert severity="success" sx={{ mb: 1.5 }}>
                  You uncover something favorable. Choose one:
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
                        Find an opportunity — envision a favorable insight or
                        resource.{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          Take +2 Momentum ({currentMomentum} →{" "}
                          {newMomentumStrong})
                        </Typography>
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="progress"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Gain progress — mark progress on your expedition
                      </Typography>
                    }
                  />
                </RadioGroup>

                {strongHitChoice === "progress" && (
                  <Box mt={1} ml={3.5}>
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
                          onChange={(e) => setSelectedTrackId(e.target.value)}
                        >
                          {tracks.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.track.label} — {t.track.difficulty},{" "}
                              {getBoxes(t)}/10 boxes
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You uncover something interesting, bound up in peril. Envision
                what you encounter. Take{" "}
                <strong>+1 Momentum</strong> ({currentMomentum} →{" "}
                {newMomentumWeak}).
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You encounter an immediate hardship or threat. Pay the Price."
                oracleResult={oracleResult}
                onOracleResult={setOracleResult}
              />
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Describe what you find (optional):
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? "What favorable thing do you discover or achieve?"
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? "What interesting but ominous thing do you encounter?"
                  : "What hardship or threat confronts you?"
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
          {step === "setup" ? "Cancel" : "Back"}
        </Button>
        {step === "result" && (
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={confirming || !canConfirmStrong}
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
