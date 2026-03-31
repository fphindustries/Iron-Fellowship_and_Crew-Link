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
const COMPEL_MOVE_IDS = [
  "starforged/moves/adventure/compel",
  "classic/moves/relationship/compel",
];

// ── Approach groups (stat key → approach description) ─────────────────────
const APPROACH_GROUPS = [
  { statKey: "heart", approachLabel: "Charm, pacify, encourage, or barter" },
  { statKey: "iron", approachLabel: "Threaten or incite" },
  { statKey: "shadow", approachLabel: "Lie or swindle" },
] as const;

// ── Local types ──────────────────────────────────────────────────────────────
type DialogStep = "setup" | "result";

// ── Props ────────────────────────────────────────────────────────────────────
export interface CompelDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function CompelDialog({ open, onClose }: CompelDialogProps) {
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
    () => COMPEL_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
    [moveMap]
  );

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
      if (
        rollData.outcome === ROLL_RESULT.HIT ||
        rollData.outcome === ROLL_RESULT.WEAK_HIT
      ) {
        // Both hit outcomes grant +1 momentum
        const newMomentum = Math.min(maxMomentum, currentMomentum + 1);
        if (newMomentum !== currentMomentum) {
          await updateCurrentCharacter({ momentum: newMomentum });
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: currentMomentum,
            newValue: newMomentum,
            cause:
              rollData.outcome === ROLL_RESULT.HIT
                ? "Compel — Strong Hit"
                : "Compel — Weak Hit",
          });
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
      <DialogTitle>Compel</DialogTitle>

      <DialogContent>
        {/* ── Step 1: Setup ───────────────────────────────────────────── */}
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you try to persuade someone or make them an offer, envision
              your approach and roll.
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              What are you trying to get them to do?
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Describe what you want and who you're trying to persuade..."
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
              Choose your approach:
            </Typography>
            <Box display="flex" flexDirection="column" gap={0.75}>
              {APPROACH_GROUPS.map(({ statKey, approachLabel }) => {
                const statRule = statRules[statKey];
                const mod = characterStats?.[statKey] ?? 0;
                const disabled = !playerContext.trim();
                return (
                  <Tooltip
                    key={statKey}
                    title={disabled ? "Describe your intent first" : ""}
                  >
                    <span>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        disabled={disabled || !statRule}
                        onClick={() => handleRoll(statKey)}
                        sx={{
                          justifyContent: "space-between",
                          px: 1.5,
                          py: 0.75,
                          textAlign: "left",
                        }}
                      >
                        <Typography variant="body2">{approachLabel}</Typography>
                        {statRule && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1, flexShrink: 0 }}
                          >
                            +{statRule.label} ({mod >= 0 ? `+${mod}` : mod})
                          </Typography>
                        )}
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

        {/* ── Step 2: Result ──────────────────────────────────────────── */}
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

            {/* ── Strong Hit ────────────────────────────────────────── */}
            {rollData.outcome === ROLL_RESULT.HIT && (
              <Alert severity="success" sx={{ mb: 2 }}>
                They agree to your terms. Take <strong>+1 Momentum</strong> (
                {currentMomentum} →{" "}
                {Math.min(maxMomentum, currentMomentum + 1)}).
              </Alert>
            )}

            {/* ── Weak Hit ──────────────────────────────────────────── */}
            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                They agree, but their compliance comes with a demand or
                complication. Take <strong>+1 Momentum</strong> (
                {currentMomentum} →{" "}
                {Math.min(maxMomentum, currentMomentum + 1)}). Envision their
                counteroffer below.
              </Alert>
            )}

            {/* ── Miss ──────────────────────────────────────────────── */}
            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="They refuse, or their demand costs you greatly. Pay the Price."
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
                ? "What do they agree to? (optional):"
                : rollData.outcome === ROLL_RESULT.WEAK_HIT
                ? "Describe their counteroffer or demand:"
                : "Describe what goes wrong (optional):"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? "What do they agree to do?"
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? "What do they want in return or what complication arises?"
                  : "How do they refuse or what do they demand?"
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
