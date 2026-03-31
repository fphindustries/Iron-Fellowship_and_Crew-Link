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
import { momentumTrack } from "data/defaultTracks";
import { useMoveRoll } from "hooks/useMoveRoll";
import { MomentumBurnAlerts } from "./MomentumBurnAlerts";
import { RollSummaryBox } from "./RollSummaryBox";
import { PayThePriceSection } from "./PayThePriceSection";

// ── Move IDs ─────────────────────────────────────────────────────────────────
const AID_YOUR_ALLY_MOVE_IDS = [
  "starforged/moves/adventure/aid_your_ally",
  "classic/moves/relationship/aid_your_ally",
];

// Out-of-combat underlying move (Secure an Advantage)
const SECURE_AN_ADVANTAGE_MOVE_IDS = [
  "starforged/moves/adventure/secure_an_advantage",
  "classic/moves/adventure/secure_an_advantage",
];

// Combat underlying move (Gain Ground for SF, falls back to Secure an Advantage for Classic)
const GAIN_GROUND_MOVE_IDS = [
  "starforged/moves/combat/gain_ground",
  // Classic has no Gain Ground — falls back to secure_an_advantage for stat lookup
  "classic/moves/adventure/secure_an_advantage",
];

// ── Local types ──────────────────────────────────────────────────────────────
type DialogStep = "setup" | "result";
type AllyAdvantageChoice = "momentum" | "adds";

// ── Props ────────────────────────────────────────────────────────────────────
export interface AidYourAllyDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function AidYourAllyDialog({ open, onClose }: AidYourAllyDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [selectedAllyId, setSelectedAllyId] = useState<string>("");
  const [inCombat, setInCombat] = useState(false);
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [allyAdvantageChoice, setAllyAdvantageChoice] =
    useState<AllyAdvantageChoice>("momentum");
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
    burnOutcome,
    canBurnMomentum,
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

  // ── Character / Campaign data ─────────────────────────────────────────────
  const currentCharacterId = useStore(
    (s) => s.characters.currentCharacter.currentCharacterId
  );
  const characterMap = useStore(
    (s) => s.campaigns.currentCampaign.characters.characterMap
  );
  const updateAllyCharacter = useStore(
    (s) => s.campaigns.currentCampaign.characters.updateCharacter
  );

  // ── Derived ──────────────────────────────────────────────────────────────

  // Aid Your Ally wrapper move (for logging)
  const aidMove = useMemo(
    () => AID_YOUR_ALLY_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
    [moveMap]
  );

  // Underlying action move (Secure an Advantage or Gain Ground)
  const underlyingMove = useMemo(
    () =>
      (inCombat ? GAIN_GROUND_MOVE_IDS : SECURE_AN_ADVANTAGE_MOVE_IDS)
        .map((id) => moveMap[id])
        .find(Boolean),
    [moveMap, inCombat]
  );

  const availableStats = useMemo(() => {
    const stats: string[] = [];
    if (underlyingMove?.roll_type === "action_roll") {
      underlyingMove.trigger.conditions.forEach((c) => {
        c.roll_options.forEach((o) => {
          if (o.using === "stat" && !stats.includes(o.stat)) {
            stats.push(o.stat);
          }
        });
      });
    }
    return stats;
  }, [underlyingMove]);

  // Allies are all campaign characters other than the current one
  const allies = useMemo(
    () =>
      Object.entries(characterMap)
        .filter(([id]) => id !== currentCharacterId)
        .map(([id, char]) => ({ id, name: char.name })),
    [characterMap, currentCharacterId]
  );

  const selectedAlly = selectedAllyId ? characterMap[selectedAllyId] : undefined;

  // Ally momentum cap (accounts for their debilities)
  const allyMaxMomentum = useMemo(() => {
    if (!selectedAlly) return momentumTrack.max;
    const debilityCount = Object.values(selectedAlly.debilities ?? {}).filter(
      Boolean
    ).length;
    return momentumTrack.max - debilityCount;
  }, [selectedAlly]);

  const allyMomentum = selectedAlly?.momentum ?? 0;
  const allyAdds = selectedAlly?.adds ?? 0;

  // Preview ally stat changes for outcome display
  const allyNewMomentumBoth = Math.min(allyMaxMomentum, allyMomentum + 2);
  const allyNewAdds = allyAdds + 1;

  const canRoll = !!playerContext.trim() && !!selectedAllyId;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRoll = (statKey: string) => {
    if (!aidMove) return;
    const statLabel = statRules[statKey]?.label ?? statKey;
    // We log the Aid Your Ally wrapper move to the game log
    roll(statKey, statLabel, aidMove);
    setStep("result");
  };

  const handleConfirm = async () => {
    if (!rollData || !aidMove || !selectedAllyId || !selectedAlly) return;
    setConfirming(true);
    try {
      await applyBurnOnConfirm(aidMove);
      await logMove(aidMove, playerContext, oracleResult, outcomeDescription);

      // ── Apply outcome effects to ally ─────────────────────────────────
      if (rollData.outcome === ROLL_RESULT.HIT) {
        // Strong Hit — ally takes both (+2 momentum AND +1 adds)
        const newMomentum = Math.min(allyMaxMomentum, allyMomentum + 2);
        const updates: { momentum?: number; adds?: number } = {};
        if (newMomentum !== allyMomentum) updates.momentum = newMomentum;
        updates.adds = allyAdds + 1;
        await updateAllyCharacter(selectedAllyId, updates);
        if (updates.momentum !== undefined) {
          logStatChangeEvent({
            stat: "Momentum",
            previousValue: allyMomentum,
            newValue: newMomentum,
            cause: `Aid Your Ally — Strong Hit (${selectedAlly.name})`,
          });
        }
        logStatChangeEvent({
          stat: "Adds",
          previousValue: allyAdds,
          newValue: allyAdds + 1,
          cause: `Aid Your Ally — Strong Hit (${selectedAlly.name})`,
        });
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        if (inCombat) {
          // Combat weak hit: ally in control, you in a bad spot — no stat changes
        } else {
          // Out-of-combat weak hit: ally takes one of their choice
          if (allyAdvantageChoice === "momentum") {
            const newMomentum = Math.min(allyMaxMomentum, allyMomentum + 2);
            if (newMomentum !== allyMomentum) {
              await updateAllyCharacter(selectedAllyId, {
                momentum: newMomentum,
              });
              logStatChangeEvent({
                stat: "Momentum",
                previousValue: allyMomentum,
                newValue: newMomentum,
                cause: `Aid Your Ally — Weak Hit (${selectedAlly.name})`,
              });
            }
          } else {
            await updateAllyCharacter(selectedAllyId, {
              adds: allyAdds + 1,
            });
            logStatChangeEvent({
              stat: "Adds",
              previousValue: allyAdds,
              newValue: allyAdds + 1,
              cause: `Aid Your Ally — Weak Hit (${selectedAlly.name})`,
            });
          }
        }
      }
      // Miss: Pay the Price — no automatic stat changes

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
    setSelectedAllyId("");
    setInCombat(false);
    setPlayerContext("");
    setOutcomeDescription("");
    setAllyAdvantageChoice("momentum");
    setOracleResult(undefined);
    resetRoll();
    onClose();
  };

  const hasAllies = allies.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={confirming}
    >
      <DialogTitle>Aid Your Ally</DialogTitle>

      <DialogContent>
        {/* ── No allies available ───────────────────────────────────────── */}
        {!hasAllies && (
          <Alert severity="info">
            Aid Your Ally requires a co-op campaign with at least one other
            character. No allies are currently in this campaign.
          </Alert>
        )}

        {/* ── Step 1: Setup ─────────────────────────────────────────────── */}
        {hasAllies && step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you act in direct support of an ally, envision how you aid
              them. If you score a hit, they (instead of you) take the benefits.
            </Typography>

            {/* Ally selector */}
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Who are you aiding?
            </Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={selectedAllyId}
              onChange={(e) => setSelectedAllyId(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="" disabled>
                Select an ally…
              </MenuItem>
              {allies.map(({ id, name }) => (
                <MenuItem key={id} value={id}>
                  {name}
                </MenuItem>
              ))}
            </Select>

            {/* Combat toggle */}
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Situation:
            </Typography>
            <RadioGroup
              row
              value={inCombat ? "combat" : "normal"}
              onChange={(e) => setInCombat(e.target.value === "combat")}
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                value="normal"
                control={<Radio size="small" />}
                label={
                  <Typography variant="body2">
                    Out of combat{" "}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      (Secure an Advantage)
                    </Typography>
                  </Typography>
                }
              />
              <FormControlLabel
                value="combat"
                control={<Radio size="small" />}
                label={
                  <Typography variant="body2">
                    In combat{" "}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      (Gain Ground)
                    </Typography>
                  </Typography>
                }
              />
            </RadioGroup>

            {/* Action description */}
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              How are you aiding them?
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="Describe how you support your ally..."
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />

            {/* Stat roll buttons */}
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
                  const disabled = !canRoll;
                  return (
                    <Tooltip
                      key={statKey}
                      title={
                        !selectedAllyId
                          ? "Select an ally first"
                          : !playerContext.trim()
                          ? "Describe how you're aiding them first"
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

        {/* ── Step 2: Result ────────────────────────────────────────────── */}
        {hasAllies && step === "result" && rollData && selectedAlly && (
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
                {inCombat ? (
                  <>
                    You are both in control. <strong>{selectedAlly.name}</strong>{" "}
                    takes both:
                  </>
                ) : (
                  <>
                    <strong>{selectedAlly.name}</strong> takes both:
                  </>
                )}
                <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
                  <li>
                    +2 Momentum ({allyMomentum} → {allyNewMomentumBoth})
                  </li>
                  <li>
                    +1 on their next move — Adds ({allyAdds} → {allyNewAdds})
                  </li>
                </Box>
              </Alert>
            )}

            {/* ── Weak Hit ─────────────────────────────────────────────── */}
            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Box mb={2}>
                {inCombat ? (
                  <Alert severity="warning">
                    <strong>{selectedAlly.name}</strong> is in control. You are
                    in a bad spot.
                  </Alert>
                ) : (
                  <>
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                      <strong>{selectedAlly.name}</strong> succeeds. Choose one
                      for them:
                    </Alert>
                    <RadioGroup
                      value={allyAdvantageChoice}
                      onChange={(e) =>
                        setAllyAdvantageChoice(
                          e.target.value as AllyAdvantageChoice
                        )
                      }
                    >
                      <FormControlLabel
                        value="momentum"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2">
                            +2 Momentum for {selectedAlly.name}{" "}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              ({allyMomentum} →{" "}
                              {Math.min(allyMaxMomentum, allyMomentum + 2)})
                            </Typography>
                          </Typography>
                        }
                      />
                      <FormControlLabel
                        value="adds"
                        control={<Radio size="small" />}
                        label={
                          <Typography variant="body2">
                            +1 on their next move — Adds{" "}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              ({allyAdds} → {allyNewAdds})
                            </Typography>
                          </Typography>
                        }
                      />
                    </RadioGroup>
                  </>
                )}
              </Box>
            )}

            {/* ── Miss ─────────────────────────────────────────────────── */}
            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="Your aid fails or backfires. Pay the Price."
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
              {rollData.outcome === ROLL_RESULT.MISS
                ? "Describe what goes wrong (optional):"
                : rollData.outcome === ROLL_RESULT.WEAK_HIT && inCombat
                ? "Describe the situation — how are you in a bad spot?:"
                : "Describe what happens (optional):"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? `How do you help ${selectedAlly.name}?`
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? inCombat
                    ? `How does ${selectedAlly.name} gain the upper hand while you're exposed?`
                    : `How does ${selectedAlly.name} gain a partial advantage?`
                  : "What goes wrong with your attempt to help?"
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
