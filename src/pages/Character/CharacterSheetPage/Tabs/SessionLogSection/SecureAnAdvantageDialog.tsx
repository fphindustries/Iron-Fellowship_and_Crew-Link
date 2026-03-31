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
  FormControlLabel,
  Radio,
  RadioGroup,
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
const SECURE_AN_ADVANTAGE_MOVE_IDS = [
  "starforged/moves/adventure/secure_an_advantage",
  "classic/moves/adventure/secure_an_advantage",
];

// ── Local types ──────────────────────────────────────────────────────────────
type DialogStep = "setup" | "result";
type AdvantageChoice = "momentum" | "adds";

// ── Props ────────────────────────────────────────────────────────────────────
export interface SecureAnAdvantageDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function SecureAnAdvantageDialog({
  open,
  onClose,
}: SecureAnAdvantageDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [advantageChoice, setAdvantageChoice] =
    useState<AdvantageChoice>("momentum");
  const [oracleResult, setOracleResult] = useState<
    { label: string; result: string } | undefined
  >();
  const [confirming, setConfirming] = useState(false);

  // ── Shared move roll hook ─────────────────────────────────────────────────
  const {
    rollData,
    characterStats,
    adds,
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
      SECURE_AN_ADVANTAGE_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
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

  const newMomentumAfterBonus = Math.min(maxMomentum, currentMomentum + 2);
  const newAddsAfterBonus = adds + 1;

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
        // Strong Hit — take BOTH
        const newMomentum = Math.min(maxMomentum, currentMomentum + 2);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentum,
            cause: "Secure an Advantage — Strong Hit",
          });
        }
        await updateCurrentCharacter({ adds: adds + 1 });
        logStatChangeEvent({
          stat: "Adds",
          previousValue: adds,
          newValue: adds + 1,
          cause: "Secure an Advantage — Strong Hit",
        });
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        if (advantageChoice === "momentum") {
          const newMomentum = Math.min(maxMomentum, currentMomentum + 2);
          if (newMomentum !== currentMomentum) {
            await updateCurrentCharacter({ momentum: newMomentum });
            logStatChangeEvent({
              stat: "Momentum",
              previousValue: currentMomentum,
              newValue: newMomentum,
              cause: "Secure an Advantage — Weak Hit",
            });
          }
        } else {
          await updateCurrentCharacter({ adds: adds + 1 });
          logStatChangeEvent({
            stat: "Adds",
            previousValue: adds,
            newValue: adds + 1,
            cause: "Secure an Advantage — Weak Hit",
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
    setAdvantageChoice("momentum");
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
      <DialogTitle>Secure an Advantage</DialogTitle>

      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you assess a situation, make preparations, or try to gain
              leverage, envision your action and roll.
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              What are you doing?
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Describe your action..."
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
                          ? "Describe your action first"
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
                You succeed! Take <strong>both</strong>:
                <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
                  <li>
                    +2 Momentum ({currentMomentum} → {newMomentumAfterBonus})
                  </li>
                  <li>
                    +1 on your next move — Adds ({adds} → {newAddsAfterBonus})
                  </li>
                </Box>
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Box mb={2}>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  You succeed. Choose <strong>one</strong>:
                </Alert>
                <RadioGroup
                  value={advantageChoice}
                  onChange={(e) =>
                    setAdvantageChoice(e.target.value as AdvantageChoice)
                  }
                >
                  <FormControlLabel
                    value="momentum"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        +2 Momentum{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          ({currentMomentum} → {newMomentumAfterBonus})
                        </Typography>
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="adds"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        +1 on your next move — Adds{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          ({adds} → {newAddsAfterBonus})
                        </Typography>
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You fail, or your assumptions betray you. Pay the Price."
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
                ? "Describe what goes wrong (optional):"
                : "Describe what happens (optional):"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? "How do you press your advantage?"
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? "How do you gain a partial advantage?"
                  : "What goes wrong or is revealed?"
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
