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
// Classic has no Check Your Gear equivalent — supply is Starforged only.
const CHECK_YOUR_GEAR_MOVE_IDS = [
  "starforged/moves/adventure/check_your_gear",
];

// ── Local types ──────────────────────────────────────────────────────────────
type DialogStep = "setup" | "result";
type WeakHitChoice = "sacrifice_resources" | "lose_momentum";

// ── Props ────────────────────────────────────────────────────────────────────
export interface CheckYourGearDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function CheckYourGearDialog({
  open,
  onClose,
}: CheckYourGearDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [weakHitChoice, setWeakHitChoice] =
    useState<WeakHitChoice>("sacrifice_resources");
  const [oracleResult, setOracleResult] = useState<
    { label: string; result: string } | undefined
  >();
  const [confirming, setConfirming] = useState(false);

  // ── Shared move roll hook ─────────────────────────────────────────────────
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

  // ── Rules ────────────────────────────────────────────────────────────────
  const moveMap = useStore((s) => s.rules.moveMaps.moveMap);
  const conditionMeterRules = useStore((s) => s.rules.conditionMeters);

  // ── Character / Campaign supply ───────────────────────────────────────────
  const isInCampaign = useStore(
    (s) => !!s.characters.currentCharacter.currentCharacter?.campaignId
  );
  const characterConditionMeters = useStore(
    (s) => s.characters.currentCharacter.currentCharacter?.conditionMeters
  );
  const campaignConditionMeters = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaign?.conditionMeters
  );
  const updateCharacterConditionMeter = useStore(
    (s) => s.characters.currentCharacter.updateCharacterConditionMeter
  );
  const updateCampaignConditionMeter = useStore(
    (s) => s.campaigns.currentCampaign.updateCampaignConditionMeter
  );

  const supplyRule = conditionMeterRules["supply"];
  const supplyIsShared = !!supplyRule?.shared;

  const supply: number = supplyIsShared && isInCampaign
    ? (campaignConditionMeters?.["supply"] ?? supplyRule?.value ?? 0)
    : (characterConditionMeters?.["supply"] ?? supplyRule?.value ?? 0);

  const supplyMin = supplyRule?.min ?? 0;
  const supplyMax = supplyRule?.max ?? 5;

  // ── Derived ──────────────────────────────────────────────────────────────
  const move = useMemo(
    () => CHECK_YOUR_GEAR_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
    [moveMap]
  );

  // Weak hit preview values
  const newSupplyAfterSacrifice = Math.max(supplyMin, supply - 1);
  const newMomentumAfterLoss = Math.max(momentumTrack.min, currentMomentum - 2);

  // ── Supply updater (shared or character) ──────────────────────────────────
  const updateSupply = async (newValue: number) => {
    if (supplyIsShared && isInCampaign) {
      await updateCampaignConditionMeter("supply", newValue);
    } else {
      await updateCharacterConditionMeter("supply", newValue);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRoll = () => {
    if (!move) return;
    // Supply is a condition meter, not a stat — pass it as modifierOverride
    roll("supply", "Supply", move, supply);
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
        // Strong hit — +1 momentum
        const newMomentum = Math.min(maxMomentum, currentMomentum + 1);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentum,
            cause: "Check Your Gear — Strong Hit",
          });
        }
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        if (weakHitChoice === "sacrifice_resources") {
          const newSupply = Math.max(supplyMin, supply - 1);
          await updateSupply(newSupply);
          logStatChangeEvent({
            stat: "Supply",
            previousValue: supply,
            newValue: newSupply,
            cause: "Check Your Gear — Sacrifice Resources",
          });
        } else {
          const newMomentum = Math.max(momentumTrack.min, currentMomentum - 2);
          if (newMomentum !== currentMomentum) {
            await updateCurrentCharacter({ momentum: newMomentum });
            logStatChangeEvent({
              stat: "Momentum",
              previousValue: currentMomentum,
              newValue: newMomentum,
              cause: "Check Your Gear — Lose Momentum",
            });
          }
        }
      }
      // Miss: Pay the Price — no automatic stat change

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
    setWeakHitChoice("sacrifice_resources");
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
      <DialogTitle>Check Your Gear</DialogTitle>

      <DialogContent>
        {/* ── Step 1: Setup ─────────────────────────────────────────────── */}
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you check to see if you have a specific helpful item or
              resource, roll +supply.
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              What are you looking for?
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Describe the item or resource you're checking for..."
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />

            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Typography variant="body2" color="text.secondary">
                Current Supply:{" "}
                <strong>
                  {supply} / {supplyMax}
                </strong>
              </Typography>
            </Box>

            <Tooltip
              title={
                !playerContext.trim()
                  ? "Describe what you're looking for first"
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
                  Roll +Supply ({supply >= 0 ? `+${supply}` : supply})
                </Button>
              </span>
            </Tooltip>
          </Box>
        )}

        {/* ── Step 2: Result ────────────────────────────────────────────── */}
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

            {/* ── Strong Hit ──────────────────────────────────────────── */}
            {rollData.outcome === ROLL_RESULT.HIT && (
              <Alert severity="success" sx={{ mb: 2 }}>
                You have it and are ready to act. Take{" "}
                <strong>+1 Momentum</strong> ({currentMomentum} →{" "}
                {Math.min(maxMomentum, currentMomentum + 1)}).
              </Alert>
            )}

            {/* ── Weak Hit ─────────────────────────────────────────────── */}
            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Box mb={2}>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  You have it, but must choose one:
                </Alert>
                <RadioGroup
                  value={weakHitChoice}
                  onChange={(e) =>
                    setWeakHitChoice(e.target.value as WeakHitChoice)
                  }
                >
                  <FormControlLabel
                    value="sacrifice_resources"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Sacrifice Resources — your supply is diminished{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          (−1 Supply: {supply} → {newSupplyAfterSacrifice})
                        </Typography>
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="lose_momentum"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Lose Momentum — it causes a complication or delay{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          (−2 Momentum: {currentMomentum} →{" "}
                          {newMomentumAfterLoss})
                        </Typography>
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {/* ── Miss ─────────────────────────────────────────────────── */}
            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You don't have it and the situation grows more perilous. Pay the Price."
                oracleResult={oracleResult}
                onOracleResult={setOracleResult}
              />
            )}

            {/* Outcome description */}
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              {rollData.outcome === ROLL_RESULT.HIT
                ? "What do you find? (optional):"
                : rollData.outcome === ROLL_RESULT.WEAK_HIT
                ? "Describe the complication or how the item is lacking (optional):"
                : "Describe how the situation grows more perilous (optional):"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? "What item or resource do you produce?"
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? "How is your gear lacking, or what delay does it cause?"
                  : "What danger emerges from not having what you need?"
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
