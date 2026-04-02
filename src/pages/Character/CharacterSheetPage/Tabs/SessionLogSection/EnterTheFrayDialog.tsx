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
import { useCombatTracker } from "hooks/useCombatTracker";
import { CombatEnemy, CombatPosition } from "types/combat.types";
import { Difficulty } from "types/Track.type";

const ENTER_THE_FRAY_MOVE_IDS = [
  "starforged/moves/combat/enter_the_fray",
  "classic/moves/combat/enter_the_fray",
];

type DialogStep = "setup" | "result";
type HitChoice = "advantage" | "progress";

export interface EnterTheFrayDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EnterTheFrayDialog({ open, onClose }: EnterTheFrayDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [objective, setObjective] = useState("");
  const [enemyInput, setEnemyInput] = useState("");
  const [enemies, setEnemies] = useState<CombatEnemy[]>([]);
  const [initialPosition, setInitialPosition] =
    useState<CombatPosition>("in_control");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    Difficulty.Dangerous
  );
  const [hitChoice, setHitChoice] = useState<HitChoice>("advantage");
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

  const { startCombat } = useCombatTracker();

  const moveMap = useStore((s) => s.rules.moveMaps.moveMap);
  const statRules = useStore((s) => s.rules.stats);

  const move = useMemo(
    () => ENTER_THE_FRAY_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
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
    return stats.length > 0 ? stats : ["heart", "iron", "edge", "shadow", "wits"];
  }, [move]);

  const addEnemy = () => {
    const name = enemyInput.trim();
    if (!name) return;
    setEnemies((prev) => [...prev, { name }]);
    setEnemyInput("");
  };

  const removeEnemy = (i: number) => {
    setEnemies((prev) => prev.filter((_, idx) => idx !== i));
  };

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
      if (objective.trim()) contextParts.push(`Objective: ${objective.trim()}`);
      if (enemies.length > 0)
        contextParts.push(`Enemies: ${enemies.map((e) => e.name).join(", ")}`);
      contextParts.push(
        `Starting position: ${initialPosition === "in_control" ? "In Control" : "In a Bad Spot"}`
      );
      if (rollData.outcome === ROLL_RESULT.HIT) {
        contextParts.push(
          hitChoice === "advantage"
            ? "Chose: Take +2 momentum & Secure an Advantage"
            : "Chose: Take +2 momentum & Mark progress twice"
        );
      }
      if (oracleResult)
        contextParts.push(`${oracleResult.label}: ${oracleResult.result}`);
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMove(move, contextParts.join("\n"), undefined, "");

      let finalPosition: CombatPosition = initialPosition;
      if (rollData.outcome === ROLL_RESULT.HIT) {
        finalPosition = "in_control";
        const newMomentum = Math.min(maxMomentum, currentMomentum + 2);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentum,
            cause: "Enter the Fray — Strong Hit",
          });
        }
      } else if (rollData.outcome === ROLL_RESULT.MISS) {
        finalPosition = "in_a_bad_spot";
      }

      await startCombat(
        objective.trim() || "Unknown objective",
        enemies,
        finalPosition,
        difficulty
      );

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
    setObjective("");
    setEnemyInput("");
    setEnemies([]);
    setInitialPosition("in_control");
    setDifficulty(Difficulty.Dangerous);
    setHitChoice("advantage");
    setOutcomeDescription("");
    setOracleResult(undefined);
    resetRoll();
    onClose();
  };

  const canRoll = !!objective.trim() && !!move;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={confirming}
    >
      <DialogTitle>Enter the Fray</DialogTitle>
      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you initiate combat or are forced into a fight, envision your
              approach and roll to see how the encounter begins.
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              What is your objective in this fight?
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. Defend the outpost, Capture the smuggler…"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />

            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Enemies (optional):
            </Typography>
            <Box display="flex" gap={1} mb={1}>
              <TextField
                size="small"
                placeholder="Enemy name…"
                value={enemyInput}
                onChange={(e) => setEnemyInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") addEnemy();
                }}
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={addEnemy}
                disabled={!enemyInput.trim()}
              >
                Add
              </Button>
            </Box>
            {enemies.length > 0 && (
              <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                {enemies.map((e, i) => (
                  <Button
                    key={i}
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => removeEnemy(i)}
                    sx={{ fontSize: "0.75rem", py: 0.25 }}
                  >
                    {e.name} ✕
                  </Button>
                ))}
              </Box>
            )}

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="difficulty-label">Combat difficulty</InputLabel>
              <Select
                labelId="difficulty-label"
                label="Combat difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <MenuItem value={Difficulty.Troublesome}>Troublesome</MenuItem>
                <MenuItem value={Difficulty.Dangerous}>Dangerous</MenuItem>
                <MenuItem value={Difficulty.Formidable}>Formidable</MenuItem>
                <MenuItem value={Difficulty.Extreme}>Extreme</MenuItem>
                <MenuItem value={Difficulty.Epic}>Epic</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
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
                      title={!canRoll ? "Describe your objective first" : ""}
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
                  You are in control. Take +2 momentum and choose one:
                </Alert>
                <RadioGroup
                  value={hitChoice}
                  onChange={(e) => setHitChoice(e.target.value as HitChoice)}
                >
                  <FormControlLabel
                    value="advantage"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Secure an Advantage before the fight begins
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="progress"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Mark progress twice
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Choose your position: you are either{" "}
                <strong>In Control</strong> or{" "}
                <strong>In a Bad Spot</strong>.
                <Box mt={1}>
                  <RadioGroup
                    value={initialPosition}
                    onChange={(e) =>
                      setInitialPosition(e.target.value as CombatPosition)
                    }
                    row
                  >
                    <FormControlLabel
                      value="in_control"
                      control={<Radio size="small" />}
                      label={<Typography variant="body2">In Control</Typography>}
                    />
                    <FormControlLabel
                      value="in_a_bad_spot"
                      control={<Radio size="small" />}
                      label={
                        <Typography variant="body2">In a Bad Spot</Typography>
                      }
                    />
                  </RadioGroup>
                </Box>
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You are caught off guard or outmatched. You are In a Bad Spot. Pay the Price."
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
              Describe how the fight begins (optional):
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="What do you see, hear, or do as the fight begins?"
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
