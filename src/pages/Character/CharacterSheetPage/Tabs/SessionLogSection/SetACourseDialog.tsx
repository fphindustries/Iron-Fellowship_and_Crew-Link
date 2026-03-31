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

const SET_A_COURSE_MOVE_IDS = [
  "starforged/moves/exploration/set_a_course",
];

type DialogStep = "setup" | "result";
type WeakHitChoice = "suffer_costs" | "face_complication";

export interface SetACourseDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SetACourseDialog({ open, onClose }: SetACourseDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [weakHitChoice, setWeakHitChoice] =
    useState<WeakHitChoice>("suffer_costs");
  const [oracleResult, setOracleResult] = useState<
    { label: string; result: string } | undefined
  >();
  const [confirming, setConfirming] = useState(false);

  const {
    rollData,
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
  const conditionMeterRules = useStore((s) => s.rules.conditionMeters);

  const isInCampaign = useStore(
    (s) => !!s.characters.currentCharacter.currentCharacter?.campaignId
  );
  const characterConditionMeters = useStore(
    (s) => s.characters.currentCharacter.currentCharacter?.conditionMeters
  );
  const campaignConditionMeters = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaign?.conditionMeters
  );

  const supplyRule = conditionMeterRules["supply"];
  const supplyIsShared = !!supplyRule?.shared;

  const supply: number = supplyIsShared && isInCampaign
    ? (campaignConditionMeters?.["supply"] ?? supplyRule?.value ?? 0)
    : (characterConditionMeters?.["supply"] ?? supplyRule?.value ?? 0);

  const move = useMemo(
    () => SET_A_COURSE_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
    [moveMap]
  );

  const handleRoll = () => {
    if (!move) return;
    roll("supply", "Supply", move, supply);
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
      } else if (weakHitChoice === "face_complication" && rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        contextParts.push("Chose: Face a complication at the destination");
      }
      if (oracleResult) contextParts.push(oracleResult.label + ": " + oracleResult.result);
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMove(move, contextParts.join("\n"), undefined, "");

      if (rollData.outcome === ROLL_RESULT.HIT) {
        const newMomentum = Math.min(maxMomentum, currentMomentum + 1);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentum,
            cause: "Set a Course — Strong Hit",
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
    setWeakHitChoice("suffer_costs");
    setOracleResult(undefined);
    resetRoll();
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
      <DialogTitle>Set a Course</DialogTitle>

      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you follow a known route through perilous space, roll +supply.
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Where are you headed?
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Describe your destination or the route you're taking..."
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />

            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Typography variant="body2" color="text.secondary">
                Current Supply:{" "}
                <strong>
                  {supply} / {supplyRule?.max ?? 5}
                </strong>
              </Typography>
            </Box>

            <Tooltip
              title={
                !playerContext.trim()
                  ? "Describe your destination first"
                  : !move
                  ? "Move not found in ruleset"
                  : ""
              }
            >
              <span>
                <Button
                  variant="outlined"
                  disabled={!playerContext.trim() || !move}
                  onClick={handleRoll}
                >
                  Roll +Supply ({supply >= 0 ? "+" + supply : supply})
                </Button>
              </span>
            </Tooltip>
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
                You reach your destination safely. Take{" "}
                <strong>+1 Momentum</strong> ({currentMomentum} →{" "}
                {Math.min(maxMomentum, currentMomentum + 1)}).
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Box mb={2}>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  You arrive, but face a cost or complication. Choose one:
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
                    value="face_complication"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Face a complication at the destination — envision what
                        you encounter
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You are waylaid by a significant threat. Pay the Price."
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
              {rollData.outcome === ROLL_RESULT.HIT
                ? "Describe your arrival (optional):"
                : rollData.outcome === ROLL_RESULT.WEAK_HIT
                ? "Describe the cost or complication (optional):"
                : "Describe the threat (optional):"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? "How does the situation favor you?"
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? "What goes wrong en route or at the destination?"
                  : "What significant threat blocks your way?"
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
