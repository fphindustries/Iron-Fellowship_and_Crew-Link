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

const REACT_UNDER_FIRE_MOVE_IDS = [
  "starforged/moves/combat/react_under_fire",
];

type WeakHitCost = "endure_harm" | "lose_ground" | "make_concession";

export interface ReactUnderFireDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ReactUnderFireDialog({
  open,
  onClose,
}: ReactUnderFireDialogProps) {
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

  const moveMap = useStore((s) => s.rules.moveMaps.moveMap);
  const statRules = useStore((s) => s.rules.stats);

  const move = useMemo(
    () => REACT_UNDER_FIRE_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
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
    return stats.length > 0
      ? stats
      : ["edge", "heart", "iron", "shadow", "wits"];
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
        const costLabels: Record<WeakHitCost, string> = {
          endure_harm: "Endure Harm",
          lose_ground: "Lose Ground (shift to In a Bad Spot)",
          make_concession: "Make a Concession",
        };
        contextParts.push(`Chose: ${costLabels[weakHitCost]}`);
      }
      if (oracleResult)
        contextParts.push(`${oracleResult.label}: ${oracleResult.result}`);
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMove(move, contextParts.join("\n"), undefined, "");
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
      <DialogTitle>React Under Fire</DialogTitle>
      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you take action to avoid or counter an immediate threat,
              choose your approach and roll.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              What threat are you reacting to?
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Describe the danger and your response…"
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
                      title={!canRoll ? "Describe the situation first" : ""}
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
              <Alert severity="success" sx={{ mb: 2 }}>
                You succeed and suffer no cost. Envision how you avoid or
                overcome the threat.
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Box mb={2}>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  You react in time, but at a cost. Choose one:
                </Alert>
                <RadioGroup
                  value={weakHitCost}
                  onChange={(e) =>
                    setWeakHitCost(e.target.value as WeakHitCost)
                  }
                >
                  <FormControlLabel
                    value="endure_harm"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Endure Harm (−1 to −3 health)
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="lose_ground"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Lose Ground — shift to In a Bad Spot
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="make_concession"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Make a concession (give up ground, lose resources)
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You fail to react in time. Pay the Price."
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
              placeholder="How do you react, and what is the cost?"
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
