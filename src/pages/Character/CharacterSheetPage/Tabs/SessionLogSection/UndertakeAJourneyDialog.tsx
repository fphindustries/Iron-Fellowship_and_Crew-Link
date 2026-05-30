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
import { useJourneyTracks, JourneyTrackEntry } from "./useJourneyTracks";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";
import { useUpdateCampaignMutation } from "hooks/queries/useCampaignsQuery";

const UNDERTAKE_A_JOURNEY_MOVE_IDS = [
  "classic/moves/adventure/undertake_a_journey",
];

type DialogStep = "setup" | "result";
// Strong Hit choices
type StrongHitChoice = "progress_only" | "progress_momentum";

export interface UndertakeAJourneyDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UndertakeAJourneyDialog({
  open,
  onClose,
}: UndertakeAJourneyDialogProps) {
  const [step, setStep] = useState<DialogStep>("setup");
  const [playerContext, setPlayerContext] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [strongHitChoice, setStrongHitChoice] =
    useState<StrongHitChoice>("progress_only");
  const [oracleResult, setOracleResult] = useState<
    { label: string; result: string } | undefined
  >();
  const [confirming, setConfirming] = useState(false);

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

  const moveMap = useStore((s) => s.rules.moveMaps.moveMap);
  const statRules = useStore((s) => s.rules.stats);
  const conditionMeterRules = useStore((s) => s.rules.conditionMeters);

  const isInCampaign = useStore(
    (s) => !!s.characters.currentCharacter.currentCharacter?.campaignId
  );
  const characterId = useStore(
    (s) => s.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaignId
  );
  const characterConditionMeters = useStore(
    (s) => s.characters.currentCharacter.currentCharacter?.conditionMeters
  );
  const campaignConditionMeters = useStore(
    (s) => s.campaigns.currentCampaign.currentCampaign?.conditionMeters
  );
  const updateCharacter = useUpdateCharacterMutation(characterId ?? "");
  const updateCampaign = useUpdateCampaignMutation(campaignId ?? "");

  const supplyRule = conditionMeterRules["supply"];
  const supplyIsShared = !!supplyRule?.shared;
  const supply: number = supplyIsShared && isInCampaign
    ? (campaignConditionMeters?.["supply"] ?? supplyRule?.value ?? 0)
    : (characterConditionMeters?.["supply"] ?? supplyRule?.value ?? 0);
  const supplyMin = supplyRule?.min ?? 0;

  const { tracks, markProgress, getBoxes } = useJourneyTracks();

  const move = useMemo(
    () =>
      UNDERTAKE_A_JOURNEY_MOVE_IDS.map((id) => moveMap[id]).find(Boolean),
    [moveMap]
  );

  const selectedEntry: JourneyTrackEntry | undefined = tracks.find(
    (t) => t.id === selectedTrackId
  );

  const witsValue = characterStats?.["wits"] ?? 0;

  const handleRoll = () => {
    if (!move) return;
    const statLabel = statRules["wits"]?.label ?? "Wits";
    roll("wits", statLabel, move);
    setStep("result");
  };

  const updateSupply = async (newValue: number) => {
    if (supplyIsShared && isInCampaign) {
      await updateCampaign.mutateAsync({
        conditionMeters: {
          ...(campaignConditionMeters ?? {}),
          supply: newValue,
        },
      });
    } else {
      await updateCharacter.mutateAsync({
        conditionMeters: {
          ...(characterConditionMeters ?? {}),
          supply: newValue,
        },
      });
    }
  };

  const handleConfirm = async () => {
    if (!rollData || !move) return;
    setConfirming(true);
    try {
      await applyBurnOnConfirm(move);

      const contextParts: string[] = [];
      if (playerContext.trim()) contextParts.push(playerContext.trim());
      if (strongHitChoice === "progress_momentum" && rollData.outcome === ROLL_RESULT.HIT) {
        contextParts.push("Chose: Mark progress + take +1 momentum (−1 supply)");
      }
      if (oracleResult) contextParts.push(oracleResult.label + ": " + oracleResult.result);
      if (outcomeDescription.trim()) contextParts.push(outcomeDescription.trim());

      await logMove(move, contextParts.join("\n"), undefined, "");

      if (
        (rollData.outcome === ROLL_RESULT.HIT ||
          rollData.outcome === ROLL_RESULT.WEAK_HIT) &&
        selectedEntry
      ) {
        await markProgress(selectedEntry);
      }

      if (rollData.outcome === ROLL_RESULT.HIT) {
        if (strongHitChoice === "progress_momentum") {
          // +1 momentum, -1 supply
          const newMomentum = Math.min(maxMomentum, currentMomentum + 1);
          if (newMomentum !== currentMomentum) {
            await updateCurrentCharacter({ momentum: newMomentum });
            logStatChangeEvent({
              stat: "Momentum",
              previousValue: currentMomentum,
              newValue: newMomentum,
              cause: "Undertake a Journey — Move at Speed",
            });
          }
          const newSupply = Math.max(supplyMin, supply - 1);
          await updateSupply(newSupply);
          logStatChangeEvent({
            stat: "Supply",
            previousValue: supply,
            newValue: newSupply,
            cause: "Undertake a Journey — Move at Speed",
          });
        }
      } else if (rollData.outcome === ROLL_RESULT.WEAK_HIT) {
        // −1 supply
        const newSupply = Math.max(supplyMin, supply - 1);
        await updateSupply(newSupply);
        logStatChangeEvent({
          stat: "Supply",
          previousValue: supply,
          newValue: newSupply,
          cause: "Undertake a Journey — Weak Hit",
        });
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
    setSelectedTrackId("");
    setStrongHitChoice("progress_only");
    setOracleResult(undefined);
    resetRoll();
    onClose();
  };

  const canRoll = !!playerContext.trim() && !!move;
  const canConfirm =
    rollData?.outcome === ROLL_RESULT.MISS || !!selectedEntry;

  const newMomentumPreview = Math.min(maxMomentum, currentMomentum + 1);
  const newSupplyPreview = Math.max(supplyMin, supply - 1);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={confirming}
    >
      <DialogTitle>Undertake a Journey</DialogTitle>

      <DialogContent>
        {step === "setup" && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              When you travel across hazardous or unfamiliar lands, roll +wits.
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Describe this leg of your journey
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder="What are you doing or watching for as you travel?"
              value={playerContext}
              onChange={(e) => setPlayerContext(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ mb: 2 }}
            />

            {tracks.length > 0 && (
              <Box mb={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Journey</InputLabel>
                  <Select
                    label="Journey"
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                  >
                    {tracks.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.track.label} — {t.track.difficulty},{" "}
                        {getBoxes(t)}/10 boxes
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            {tracks.length === 0 && (
              <Typography variant="body2" color="text.secondary" mb={2}>
                No active journeys found. Create a journey track first.
              </Typography>
            )}

            <Tooltip title={!canRoll ? "Describe your journey first" : ""}>
              <span>
                <Button
                  variant="outlined"
                  disabled={!canRoll}
                  onClick={handleRoll}
                >
                  Roll +Wits ({witsValue >= 0 ? "+" + witsValue : witsValue})
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
              <Box mb={2}>
                <Alert severity="success" sx={{ mb: 1.5 }}>
                  You reach a waypoint. Envision the location, then choose one:
                </Alert>
                <RadioGroup
                  value={strongHitChoice}
                  onChange={(e) =>
                    setStrongHitChoice(e.target.value as StrongHitChoice)
                  }
                >
                  <FormControlLabel
                    value="progress_only"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Make good use of your resources — mark progress only
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="progress_momentum"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2">
                        Move at speed — mark progress, take +1 momentum, suffer
                        −1 supply{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          (Momentum: {currentMomentum} → {newMomentumPreview},{" "}
                          Supply: {supply} → {newSupplyPreview})
                        </Typography>
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            {rollData.outcome === ROLL_RESULT.WEAK_HIT && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You reach a waypoint and mark progress, but suffer{" "}
                <strong>−1 Supply</strong> ({supply} → {newSupplyPreview}).
              </Alert>
            )}

            {rollData.outcome === ROLL_RESULT.MISS && (
              <PayThePriceSection
                missText="You are waylaid by a perilous event. Pay the Price."
                oracleResult={oracleResult}
                onOracleResult={setOracleResult}
              />
            )}

            {rollData.outcome !== ROLL_RESULT.MISS && (
              <Box mb={2}>
                {tracks.length > 0 ? (
                  <FormControl size="small" fullWidth>
                    <InputLabel>Journey to mark progress on</InputLabel>
                    <Select
                      label="Journey to mark progress on"
                      value={selectedTrackId}
                      onChange={(e) => setSelectedTrackId(e.target.value)}
                    >
                      {tracks.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.track.label} — {t.track.difficulty},{" "}
                          {getBoxes(t)}/10 boxes
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No active journeys to mark progress on.
                  </Typography>
                )}
              </Box>
            )}

            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Describe the waypoint you reach (optional):
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              placeholder={
                rollData.outcome === ROLL_RESULT.HIT
                  ? "What does this waypoint look like?"
                  : rollData.outcome === ROLL_RESULT.WEAK_HIT
                  ? "What is the waypoint, and how are your resources taxed?"
                  : "What perilous event waylay you?"
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
            disabled={confirming || !canConfirm}
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
