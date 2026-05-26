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
  Typography,
} from "@mui/material";
import { useStore } from "stores/store";
import { ROLL_RESULT } from "types/DieRolls.type";
import { useMoveRoll } from "hooks/useMoveRoll";
import { MomentumBurnAlerts } from "./MomentumBurnAlerts";
import { RollSummaryBox } from "./RollSummaryBox";
import { PayThePriceSection } from "./PayThePriceSection";
import { useCombatTracker } from "hooks/useCombatTracker";

const STRIKE_MOVE_IDS = [
  "starforged/moves/combat/strike",
  "classic/moves/combat/strike",
];

type WeakHitCost = "endure_harm" | "lose_ground";

export interface StrikeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function StrikeDialog({ open, onClose }: StrikeDialogProps) {
  const [step, setStep] = useState<"setup" | "result">("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [weakHitCost, setWeakHitCost] = useState<WeakHitCost>("endure_harm");
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
    roll,
    burnMomentum,
    applyBurnOnConfirm,
    logMove,
    resetRoll,
  } = useMoveRoll();

  const { markCombatProgress } = useCombatTracker();

  const moveMap = useStore((s) => s.rules.moveMaps.moveMap);
  const statRules = useStore((s) => s.rules.stats);

  const move = useMemo(
    () => STRIKE_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
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
    return stats.length > 0 ? stats : ["iron", "edge"];
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
      if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        contextParts.push(
          weakHitCost === "endure_harm"
            ? "Chose: Mark progress once, Endure Harm (−2 health)"
            : "Chose: Mark progress once, Lose Ground"
        );
      }
      if (oracleResult)
        contextParts.push(`${oracleResult.label}: ${oracleResult.result}`);
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMove(move, contextParts.join("\n"), undefined, "");

      if (rollData.outcome === ROLL_RESULT.HIT) {
        await markCombatProgress(2);
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        await markCombatProgress(1);
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
    setWeakHitCost("endure_harm");
    setOutcomeDescription("");
    setOracleResult(undefined);
    resetRoll();
    onClose();
  };

  const canRoll = !!playerContext.trim() && !!move;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={confirming}
    >
      <DialogTitle>Strike</DialogTitle>
      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you attack in close quarters, roll +iron. When you attack
              at range, roll +edge.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Describe your attack:
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="How do you strike?"
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Roll with:
            </Typography>
            <Box display="flex" gap={1}>
              {availableStats
                .filter((sk) => statRules[sk])
                .map((statKey) => {
                  const mod = characterStats?.[statKey] ?? 0;
                  const label = statRules[statKey].label;
                  return (
                    <Button
                      key={statKey}
                      variant="outlined"
                      size="small"
                      disabled={!canRoll}
                      onClick={() => handleRoll(statKey)}
                      sx={{ minWidth: 80 }}
                    >
                      {label}{" "}
                      <Typography component="span" variant="caption" ml={0.5} color="text.secondary">
                        {mod >= 0 ? "+" + mod : mod}
                      </Typography>
                    </Button>
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
                You strike true. Mark progress <strong>twice</strong>.
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Box mb={2}>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  You strike but are countered. Mark progress <strong>once</strong>. Choose one:
                </Alert>
                <RadioGroup
                  value={weakHitCost}
                  onChange={(e) => setWeakHitCost(e.target.value as WeakHitCost)}
                >
                  <FormControlLabel
                    value="endure_harm"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">Endure Harm (−2 health)</Typography>}
                  />
                  <FormControlLabel
                    value="lose_ground"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">Lose Ground — shift to In a Bad Spot</Typography>}
                  />
                </RadioGroup>
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="Your attack fails. Pay the Price."
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
              placeholder="How does the strike land?"
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
