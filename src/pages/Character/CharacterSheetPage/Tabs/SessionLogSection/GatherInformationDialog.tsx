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

// ── Move IDs ─────────────────────────────────────────────────────────────────
const GATHER_INFORMATION_MOVE_IDS = [
  "starforged/moves/adventure/gather_information",
  "classic/moves/adventure/gather_information",
];

// ── Local types ──────────────────────────────────────────────────────────────
type DialogStep = "setup" | "result";

// ── Props ────────────────────────────────────────────────────────────────────
export interface GatherInformationDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function GatherInformationDialog({
  open,
  onClose,
}: GatherInformationDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [oracleResult, setOracleResult] = useState<
    { label: string; result: string } | undefined
  >();
  const [confirming, setConfirming] = useState(false);

  // ── Shared move roll hook ─────────────────────────────────────────────────
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

  // ── Rules ────────────────────────────────────────────────────────────────
  const moveMap = useStore((s) => s.rules.moveMaps.moveMap);
  const statRules = useStore((s) => s.rules.stats);

  // ── Derived ──────────────────────────────────────────────────────────────
  const move = useMemo(
    () =>
      GATHER_INFORMATION_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
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

  // ── Handlers ─────────────────────────────────────────────────────────────
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
      await logMove(move, playerContext, oracleResult, outcomeDescription);

      // ── Outcome effects ────────────────────────────────────────────────
      if (rollData.outcome === ROLL_RESULT.HIT) {
        const newMomentum = Math.min(maxMomentum, currentMomentum + 2);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentum,
            cause: "Gather Information — Strong Hit",
          });
        }
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        const newMomentum = Math.min(maxMomentum, currentMomentum + 1);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentum,
            cause: "Gather Information — Weak Hit",
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
    setOracleResult(undefined);
    resetRoll();
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={confirming}
    >
      <DialogTitle>Gather Information</DialogTitle>

      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you search an area, ask questions, conduct research, or
              follow a track, roll +wits.
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
              placeholder="Describe what you're looking for or asking about..."
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />
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
                  const disabled = !playerContext.trim();
                  return (
                    <Tooltip
                      key={statKey}
                      title={
                        disabled
                          ? "Describe your investigation first"
                          : `Roll +${label}`
                      }
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
                            {mod >= 0 ? `+${mod}` : mod}
                          </Typography>
                        </Button>
                      </span>
                    </Tooltip>
                  );
                })}
              {!characterStats && (
                <Typography variant="body2" color="text.secondary">
                  No character loaded.
                </Typography>
              )}
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
                You discover something helpful and specific. The path forward
                is made clear. Take <strong>+2 Momentum</strong> (
                {currentMomentum} →{" "}
                {Math.min(maxMomentum, currentMomentum + 2)}).
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You gain new insight, but it complicates your quest. Take{" "}
                <strong>+1 Momentum</strong> ({currentMomentum} →{" "}
                {Math.min(maxMomentum, currentMomentum + 1)}).
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="Your investigation unearths a dire threat or unwelcome truth. Pay the Price."
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
              {rollData.outcome === ROLL_RESULT.MISS
                ? "Describe the threat or truth you uncover (optional):"
                : rollData.outcome === ROLL_RESULT.WEAK_HIT
                ? "What do you discover, and how does it complicate things (optional):"
                : "What do you learn? (optional):"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? "What helpful information do you find?"
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? "What insight do you gain, and what complication arises?"
                  : "What dire threat or unwelcome truth is revealed?"
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
