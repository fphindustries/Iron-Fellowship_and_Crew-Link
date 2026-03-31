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
import { momentumTrack } from "data/defaultTracks";
import { useMoveRoll } from "hooks/useMoveRoll";
import { MomentumBurnAlerts } from "./MomentumBurnAlerts";
import { RollSummaryBox } from "./RollSummaryBox";
import { PayThePriceSection } from "./PayThePriceSection";

// ── Move IDs ─────────────────────────────────────────────────────────────────
const FACE_DANGER_MOVE_IDS = [
  "starforged/moves/adventure/face_danger",
  "classic/moves/adventure/face_danger",
];

// ── Local types ──────────────────────────────────────────────────────────────
type DialogStep = "setup" | "result";
type SufferChoice = "endure_harm" | "endure_stress" | "lose_momentum";

// ── Props ────────────────────────────────────────────────────────────────────
export interface FaceDangerDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function FaceDangerDialog({ open, onClose }: FaceDangerDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [sufferChoice, setSufferChoice] = useState<SufferChoice>("endure_harm");
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
  const conditionMeterRules = useStore((s) => s.rules.conditionMeters);

  // ── Character (Face Danger-specific: condition meters) ────────────────────
  const characterConditionMeters = useStore(
    (s) => s.characters.currentCharacter.currentCharacter?.conditionMeters
  );
  const isInCampaign = useStore(
    (s) => !!s.characters.currentCharacter.currentCharacter?.campaignId
  );
  const campaignConditionMeters = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaign?.conditionMeters
  );
  const updateCharacterConditionMeter = useStore(
    (s) => s.characters.currentCharacter.updateCharacterConditionMeter
  );

  // ── Derived ──────────────────────────────────────────────────────────────
  const move = useMemo(
    () => FACE_DANGER_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
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

  const getConditionMeterValue = (key: string): number => {
    const rule = conditionMeterRules[key];
    if (rule?.shared && isInCampaign && campaignConditionMeters) {
      return campaignConditionMeters[key] ?? rule.value;
    }
    return characterConditionMeters?.[key] ?? rule?.value ?? 0;
  };

  const hasHealth = !!conditionMeterRules["health"];
  const hasSpirit = !!conditionMeterRules["spirit"];

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
        const newMomentum = Math.min(maxMomentum, currentMomentum + 1);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentum,
            cause: "Face Danger — Strong Hit",
          });
        }
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        if (sufferChoice === "endure_harm" && hasHealth) {
          const current = getConditionMeterValue("health");
          const newVal = Math.max(0, current - 1);
          await updateCharacterConditionMeter("health", newVal);
          logStatChangeEvent({
            stat: "Health",
            previousValue: current,
            newValue: newVal,
            cause: "Face Danger — Endure Harm",
          });
        } else if (sufferChoice === "endure_stress" && hasSpirit) {
          const current = getConditionMeterValue("spirit");
          const newVal = Math.max(0, current - 1);
          await updateCharacterConditionMeter("spirit", newVal);
          logStatChangeEvent({
            stat: "Spirit",
            previousValue: current,
            newValue: newVal,
            cause: "Face Danger — Endure Stress",
          });
        } else {
          const newMomentum = Math.max(momentumTrack.min, currentMomentum - 1);
          if (newMomentum !== currentMomentum) {
            await updateCurrentCharacter({ momentum: newMomentum });
            logStatChangeEvent({
              stat: "Momentum",
              previousValue: currentMomentum,
              newValue: newMomentum,
              cause: "Face Danger — Lose Momentum",
            });
          }
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
    setSufferChoice("endure_harm");
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
      <DialogTitle>Face Danger</DialogTitle>

      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you attempt something risky or react to an imminent threat,
              envision your action and roll.
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
                You succeed! Take <strong>+1 Momentum</strong> (
                {currentMomentum} →{" "}
                {Math.min(maxMomentum, currentMomentum + 1)}).
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Box mb={2}>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  You succeed, but at a cost. Make a suffer move.
                </Alert>
                <RadioGroup
                  value={sufferChoice}
                  onChange={(e) =>
                    setSufferChoice(e.target.value as SufferChoice)
                  }
                >
                  {hasHealth && (
                    <FormControlLabel
                      value="endure_harm"
                      control={<Radio size="small" />}
                      label={
                        <Typography variant="body2">
                          Endure Harm{" "}
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            (−1 Health: {getConditionMeterValue("health")} →{" "}
                            {Math.max(0, getConditionMeterValue("health") - 1)})
                          </Typography>
                        </Typography>
                      }
                    />
                  )}
                  {hasSpirit && (
                    <FormControlLabel
                      value="endure_stress"
                      control={<Radio size="small" />}
                      label={
                        <Typography variant="body2">
                          Endure Stress{" "}
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            (−1 Spirit: {getConditionMeterValue("spirit")} →{" "}
                            {Math.max(0, getConditionMeterValue("spirit") - 1)})
                          </Typography>
                        </Typography>
                      }
                    />
                  )}
                  <FormControlLabel
                    value="lose_momentum"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Lose Momentum{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          (−1 Momentum: {currentMomentum} →{" "}
                          {Math.max(momentumTrack.min, currentMomentum - 1)})
                        </Typography>
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You fail, or face a serious consequence. Pay the Price."
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
              Describe what happens
              {rollData.outcome === ROLL_RESULT.MISS
                ? " (the consequence)"
                : " (optional)"}
              :
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? "How do you succeed?"
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? "How do you succeed, and what does the cost look like?"
                  : "What goes wrong?"
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
