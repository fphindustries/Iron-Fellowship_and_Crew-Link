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
import { useCombatTracker } from "hooks/useCombatTracker";

const GAIN_GROUND_MOVE_IDS = [
  "starforged/moves/combat/gain_ground",
];

type HitChoice = "momentum" | "control";

export interface GainGroundDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GainGroundDialog({ open, onClose }: GainGroundDialogProps) {
  const [step, setStep] = useState<"setup" | "result">("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [hitChoice, setHitChoice] = useState<HitChoice>("momentum");
  const [outcomeDescription, setOutcomeDescription] = useState("");
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
    maxMomentum,
    currentMomentum,
    updateCurrentCharacter,
    logStatChangeEvent,
    roll,
    burnMomentum,
    applyBurnOnConfirm,
    logMove,
    resetRoll,
  } = useMoveRoll();

  const { setPosition, markCombatProgress } = useCombatTracker();

  const moveMap = useStore((s) => s.rules.moveMaps.moveMap);
  const statRules = useStore((s) => s.rules.stats);

  const move = useMemo(
    () => GAIN_GROUND_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
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
    return stats.length > 0 ? stats : ["edge", "heart", "iron", "shadow", "wits"];
  }, [move]);

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
      if (rollData.outcome === ROLL_RESULT.HIT) {
        contextParts.push(
          hitChoice === "momentum"
            ? "Chose: +2 momentum"
            : "Chose: In Control + mark progress"
        );
      }
      if (oracleResult)
        contextParts.push(`${oracleResult.label}: ${oracleResult.result}`);
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMove(move, contextParts.join("\n"), undefined, "");

      if (rollData.outcome === ROLL_RESULT.HIT) {
        if (hitChoice === "momentum") {
          const newMomentum = Math.min(maxMomentum, currentMomentum + 2);
          if (newMomentum !== currentMomentum) {
            await updateCurrentCharacter({ momentum: newMomentum });
            logStatChangeEvent({
              stat: "Momentum",
              previousValue: currentMomentum,
              newValue: newMomentum,
              cause: "Gain Ground — Strong Hit",
            });
          }
        } else {
          await setPosition("in_control");
          await markCombatProgress(1);
        }
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        const newMomentum = Math.min(maxMomentum, currentMomentum + 1);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentum,
            cause: "Gain Ground — Weak Hit",
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
    setHitChoice("momentum");
    setOutcomeDescription("");
    setOracleResult(undefined);
    resetRoll();
    onClose();
  };

  const canRoll = !!playerContext.trim() && !!move;
  const newMomentumPreview = Math.min(maxMomentum, currentMomentum + 2);
  const newMomentumWeakPreview = Math.min(maxMomentum, currentMomentum + 1);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={confirming}
    >
      <DialogTitle>Gain Ground</DialogTitle>
      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you take action to shift the fight in your favor, choose your
              approach and roll.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              What are you doing?
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Describe how you press the advantage…"
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Roll with:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {availableStats
                .filter((sk) => statRules[sk])
                .map((statKey) => {
                  const mod = characterStats?.[statKey] ?? 0;
                  const label = statRules[statKey].label;
                  return (
                    <Tooltip
                      key={statKey}
                      title={!canRoll ? "Describe your action first" : ""}
                    >
                      <span>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={!canRoll}
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
              <Box mb={2}>
                <Alert severity="success" sx={{ mb: 1.5 }}>
                  You succeed. Choose one:
                </Alert>
                <RadioGroup
                  value={hitChoice}
                  onChange={(e) => setHitChoice(e.target.value as HitChoice)}
                >
                  <FormControlLabel
                    value="momentum"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Take +2 momentum{" "}
                        <Typography component="span" variant="caption" color="text.secondary">
                          ({currentMomentum} → {newMomentumPreview})
                        </Typography>
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="control"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Shift to <strong>In Control</strong> and mark progress
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You gain a momentary advantage. Take +1 momentum{" "}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({currentMomentum} → {newMomentumWeakPreview})
                </Typography>
                .
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You fail to gain ground. Pay the Price."
                oracleResult={oracleResult}
                onOracleResult={setOracleResult}
              />
            )}

            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Describe what happens (optional):
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="What do you do, and how does the fight shift?"
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
              confirming ? <CircularProgress size={16} color="inherit" /> : undefined
            }
          >
            {confirming ? "Saving…" : "Confirm"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
