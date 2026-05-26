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
  Tooltip,
  Typography,
} from "@mui/material";
import { useStore } from "stores/store";
import { ROLL_RESULT } from "types/DieRolls.type";
import { useMoveRoll } from "hooks/useMoveRoll";
import { MomentumBurnAlerts } from "./MomentumBurnAlerts";
import { RollSummaryBox } from "./RollSummaryBox";
import { PayThePriceSection } from "./PayThePriceSection";
import { useJourneyTracks, JourneyTrackEntry } from "./useJourneyTracks";
import { getDifficultyStep } from "functions/moveUtils";

const UNDERTAKE_AN_EXPEDITION_MOVE_IDS = [
  "starforged/moves/exploration/undertake_an_expedition",
];

type DialogStep = "setup" | "result";
type WeakHitChoice = "suffer_costs" | "face_peril";

export interface UndertakeAnExpeditionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UndertakeAnExpeditionDialog({
  open,
  onClose,
}: UndertakeAnExpeditionDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [weakHitChoice, setWeakHitChoice] =
    useState<WeakHitChoice>("suffer_costs");
  const [oracleResult, setOracleResult] = useState<
    { label: string; result: string } | undefined
  >();
  const [confirming, setConfirming] = useState(false);

  const {
    rollData,
    characterStats,
    momentum,
    momentumResetValue,
    burnOutcome,
    canBurnMomentum,
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
    () =>
      UNDERTAKE_AN_EXPEDITION_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
    [moveMap]
  );

  const availableStats = useMemo(() => {
    const stats: string[] = [];
    if (move?.roll_type === "action_roll") {
      move.trigger.conditions.forEach((c) => {
        c.roll_options.forEach((o) => {
          if (o.using === "stat" && !stats.includes(o.stat)) {
            stats.push(o.stat);
          }
        });
      });
    }
    return stats;
  }, [move]);

  const selectedTrackEntry: JourneyTrackEntry | undefined = tracks.find(
    (t) => t.id === selectedTrackId
  );

  const progressPreview = selectedTrackEntry
    ? Math.min(40, selectedTrackEntry.track.value + getDifficultyStep(selectedTrackEntry.track.difficulty))
    : undefined;

  const handleRoll = (statKey: string) => {
    if (!move) return;
    const statLabel = statRules[statKey]?.label ?? statKey;
    roll(statKey, statLabel, move);
    setStep("result");
  };

  const handleConfirm = async () => {
    if (!rollData || !move) return;
    setConfirming(true);
    try {
      await applyBurnOnConfirm(move);

      const contextParts: string[] = [];
      if (playerContext.trim()) contextParts.push(playerContext.trim());
      if (weakHitChoice === "suffer_costs" && rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        contextParts.push("Chose: Suffer costs en route (make a suffer move)");
      } else if (weakHitChoice === "face_peril" && rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        contextParts.push("Chose: Face a peril at the waypoint");
      }
      if (oracleResult) contextParts.push(oracleResult.label + ": " + oracleResult.result);
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMove(move, contextParts.join("\n"), undefined, "");

      if (
        (rollData.outcome === ROLL_RESULT.HIT ||
          rollData.outcome === ROLL_RESULT.WEAK_HIT) &&
        selectedTrackEntry
      ) {
        await markProgress(selectedTrackEntry);
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
    setSelectedTrackId("");
    setWeakHitChoice("suffer_costs");
    setOracleResult(undefined);
    resetRoll();
    onClose();
  };

  const canRoll = !!playerContext.trim() && !!move;
  const canConfirm =
    rollData?.outcome === ROLL_RESULT.MISS || !!selectedTrackEntry;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={confirming}
    >
      <DialogTitle>Undertake an Expedition</DialogTitle>

      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you journey through dangerous or unfamiliar space, choose
              your approach and roll: Wary (wits), Stealthy (shadow), or Swift
              (edge).
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              What are you doing or watching for?
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Describe your approach to this leg of the expedition..."
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />

            {tracks.length > 0 && (
              <Box mb={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Expedition</InputLabel>
                  <Select
                    label="Expedition"
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                  >
                    {tracks.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.track.label} — {t.track.difficulty}, {getBoxes(t)}
                        /10 boxes
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {tracks.length === 0 && (
              <Typography variant="body2" color="text.secondary" mb={2}>
                No active expeditions found. Create a journey track first.
              </Typography>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={1}
            >
              Roll with:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {availableStats
                .filter((sk) => statRules[sk])
                .map((statKey) => {
                  const mod = characterStats?.[statKey] ?? 0;
                  const label = statRules[statKey].label;
                  const disabled = !canRoll;
                  return (
                    <Tooltip
                      key={statKey}
                      title={disabled ? "Describe your approach first" : ""}
                    >
                      <span>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={disabled}
                          onClick={() => handleRoll(statKey)}
                          sx={{ minWidth: 80 }}
                        >
                          {label}{" "}
                          <Typography
                            component="span"
                            variant="caption"
                            ml={0.5}
                            color="text.secondary"
                          >
                            {mod >= 0 ? "+" + mod : mod}
                          </Typography>
                        </Button>
                      </span>
                    </Tooltip>
                  );
                })}
            </Box>
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
              <Alert severity="success" sx={{ mb: 2 }}>
                You reach a waypoint. Envision the location and{" "}
                <strong>mark progress</strong> per the expedition&apos;s rank.
                {selectedTrackEntry && progressPreview !== undefined && (
                  <Box mt={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {selectedTrackEntry.track.label}:{" "}
                      {Math.floor(selectedTrackEntry.track.value / 4)} →{" "}
                      {Math.floor(progressPreview / 4)} boxes
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Box mb={2}>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  You reach a waypoint and mark progress, but this progress
                  costs you. Choose one:
                  {selectedTrackEntry && progressPreview !== undefined && (
                    <Box mt={0.5}>
                      <Typography variant="caption">
                        {selectedTrackEntry.track.label}:{" "}
                        {Math.floor(selectedTrackEntry.track.value / 4)} →{" "}
                        {Math.floor(progressPreview / 4)} boxes
                      </Typography>
                    </Box>
                  )}
                </Alert>
                <RadioGroup
                  value={weakHitChoice}
                  onChange={(e) =>
                    setWeakHitChoice(e.target.value as WeakHitChoice)
                  }
                >
                  <FormControlLabel
                    value="suffer_costs"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Suffer costs en route — make a suffer move (−2), or two
                        suffer moves (−1 each)
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="face_peril"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Face a peril at the waypoint — envision what you
                        encounter
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You are waylaid by a crisis. Do not mark progress. Pay the Price."
                oracleResult={oracleResult}
                onOracleResult={setOracleResult}
              />
            )}

            {rollData.outcome !== ROLL_RESULT.MISS && (
              <Box mb={2}>
                {tracks.length > 0 ? (
                  <FormControl size="small" fullWidth>
                    <InputLabel>Expedition to mark progress on</InputLabel>
                    <Select
                      label="Expedition to mark progress on"
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
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No active expeditions to mark progress on.
                  </Typography>
                )}
              </Box>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Describe the waypoint you reach (optional):
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? "What does this waypoint look like?"
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? "What is the waypoint, and what does the cost look like?"
                  : "What crisis or hardship waylay you?"
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
            disabled={confirming || !canConfirm}
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
