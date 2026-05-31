import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { useStore } from "stores/store";
import { MoveRollers } from "components/features/charactersAndCampaigns/LinkedDialog/LinkedDialogContent/MoveDialogContent/MoveRollers";
import { RollDisplay } from "components/features/charactersAndCampaigns/RollDisplay";
import { getRollResultLabel } from "components/features/charactersAndCampaigns/RollDisplay";
import { ROLL_RESULT, StatRoll } from "types/DieRolls.type";
import { streamNarrative } from "api/ai/streamNarrative";
import { useAIGuideContext } from "hooks/useAIGuideContext";
import { NarrativeRequestPayload } from "types/aiGuide.types";
import { useAddSceneEventMutation } from "hooks/queries/useSceneEventsQuery";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";

interface GuidedMoveModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  intent: string;
  moveName?: string | null;
}

export function GuidedMoveModal({
  open,
  onClose,
  onComplete,
  intent,
  moveName,
}: GuidedMoveModalProps) {
  const moveMap = useStore((store) => store.rules.moveMaps.moveMap);
  const campaignCharacters = useStore(
    (store) => store.campaigns.currentCampaign.characters.characterMap
  );
  const currentCharacterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const setCurrentCharacterId = useStore(
    (store) => store.characters.currentCharacter.setCurrentCharacterId
  );
  const momentum = useStore(
    (store) => store.characters.currentCharacter.currentCharacter?.momentum ?? 0
  );
  const momentumResetValue = useStore(
    (store) => store.characters.currentCharacter.momentumResetValue ?? 2
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const activeSessionId = useStore(
    (store) => store.sessionLog.activeSessionId
  );
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const currentSceneTitle = useStore(
    (store) => store.aiGuide.state?.currentScene.title
  );
  const guideContext = useAIGuideContext();
  const addSceneEvent = useAddSceneEventMutation(campaignId);

  const moveNameLower = moveName?.toLowerCase();
  const move = moveNameLower
    ? Object.values(moveMap).find((m) => m.name.toLowerCase() === moveNameLower)
    : undefined;

  const [step, setStep] = useState<"move" | "outcome">("move");
  const [narrateLoading, setNarrateLoading] = useState(false);
  const [narrateError, setNarrateError] = useState("");
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [burningMomentum, setBurningMomentum] = useState(false);
  const [playerContext, setPlayerContext] = useState(intent);
  const [rolledPlayerContext, setRolledPlayerContext] = useState(intent);
  const [actingCharacterId, setActingCharacterId] = useState("");
  const [lastRoll, setLastRoll] = useState<StatRoll>();
  const [outcomeText, setOutcomeText] = useState("");
  const wasOpenRef = useRef(false);
  const updateActingCharacter = useUpdateCharacterMutation(actingCharacterId);

  const characterOptions = useMemo(
    () => Object.entries(campaignCharacters),
    [campaignCharacters]
  );

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setStep("move");
    setNarrateLoading(false);
    setNarrateError("");
    setSavingOutcome(false);
    setBurningMomentum(false);
    setPlayerContext(intent);
    setRolledPlayerContext(intent);
    setLastRoll(undefined);
    setOutcomeText("");
    const firstCharacterId = characterOptions[0]?.[0] ?? "";
    const nextCharacterId =
      currentCharacterId && campaignCharacters[currentCharacterId]
        ? currentCharacterId
        : firstCharacterId;
    setActingCharacterId(nextCharacterId);
  }, [campaignCharacters, characterOptions, currentCharacterId, intent, open]);

  useEffect(() => {
    if (!open || !actingCharacterId) return;
    const actingCharacter = campaignCharacters[actingCharacterId];
    if (!actingCharacter) return;
    useStore.setState((store) => {
      store.characters.characterMap[actingCharacterId] = actingCharacter;
    });
    setCurrentCharacterId(actingCharacterId);
  }, [actingCharacterId, campaignCharacters, open, setCurrentCharacterId]);

  const handleRollComplete = useCallback(
    (roll: StatRoll) => {
      setLastRoll(roll);
      setRolledPlayerContext(playerContext);
      setOutcomeText("");
      setNarrateError("");
      setStep("outcome");
    },
    [playerContext]
  );

  const burnOutcome =
    lastRoll && momentum > 0
      ? getBurnOutcome(momentum, lastRoll.challenge1, lastRoll.challenge2)
      : undefined;
  const canBurnMomentum =
    lastRoll &&
    burnOutcome !== undefined &&
    !lastRoll.momentumBurned &&
    momentum > 0 &&
    burnOutcome < lastRoll.result;

  const streamOutcome = useCallback(
    async (prompt?: string) => {
      if (!activeSessionId || !lastRoll) return;

      setNarrateLoading(true);
      setNarrateError("");
      setOutcomeText("");

      try {
        let streamedText = "";
        const payload: NarrativeRequestPayload = {
          sessionId: activeSessionId,
          characterId: characterId ?? undefined,
          campaignId: campaignId ?? undefined,
          moveEvent: {
            moveName: lastRoll.moveName ?? move?.name ?? "Unknown Move",
            moveId: lastRoll.moveId ?? move?._id ?? "",
            stat: lastRoll.rollLabel,
            statValue: lastRoll.modifier,
            playerContext: rolledPlayerContext,
            outcome: lastRoll.result,
            action: lastRoll.action,
            challengeDice: [lastRoll.challenge1, lastRoll.challenge2],
            score: getActionScore(lastRoll),
          },
          prompt,
          gameContext: guideContext,
        };

        await streamNarrative(payload, (chunk) => {
          streamedText += chunk;
          setOutcomeText(streamedText);
        });
      } catch (error) {
        setNarrateError(
          error instanceof Error
            ? error.message
            : "Could not narrate the outcome."
        );
      } finally {
        setNarrateLoading(false);
      }
    },
    [
      activeSessionId,
      campaignId,
      characterId,
      guideContext,
      lastRoll,
      move,
      rolledPlayerContext,
    ]
  );

  const handleAiNarrate = useCallback(() => {
    void streamOutcome();
  }, [streamOutcome]);

  const handleElaborate = useCallback(() => {
    const prompt = outcomeText.trim();
    if (!prompt) return;
    void streamOutcome(prompt);
  }, [outcomeText, streamOutcome]);

  const handleBurnMomentum = useCallback(async () => {
    if (!lastRoll || burnOutcome === undefined || !actingCharacterId) return;

    setBurningMomentum(true);
    setNarrateError("");
    try {
      await updateActingCharacter.mutateAsync({ momentum: momentumResetValue });
      setLastRoll({
        ...lastRoll,
        momentumBurned: momentum,
        result: burnOutcome,
      });
      useStore.setState((store) => {
        const campaignCharacter =
          store.campaigns.currentCampaign.characters.characterMap[
            actingCharacterId
          ];
        if (campaignCharacter) campaignCharacter.momentum = momentumResetValue;

        const character = store.characters.characterMap[actingCharacterId];
        if (character) character.momentum = momentumResetValue;

        if (
          store.characters.currentCharacter.currentCharacterId ===
          actingCharacterId
        ) {
          const current = store.characters.currentCharacter.currentCharacter;
          if (current) current.momentum = momentumResetValue;
        }
      });
    } catch (error) {
      setNarrateError(
        error instanceof Error ? error.message : "Could not burn momentum."
      );
    } finally {
      setBurningMomentum(false);
    }
  }, [
    actingCharacterId,
    burnOutcome,
    lastRoll,
    momentum,
    momentumResetValue,
    updateActingCharacter,
  ]);

  const handleDone = useCallback(async () => {
    if (step !== "outcome") {
      onClose();
      return;
    }

    if (!campaignId) {
      onComplete?.();
      onClose();
      return;
    }

    setSavingOutcome(true);
    setNarrateError("");
    try {
      await addSceneEvent.mutateAsync({
        sceneId: currentSceneTitle?.trim() || "current-scene",
        type: lastRoll ? "move_roll" : "player_action",
        actorId: actingCharacterId || characterId || null,
        visibility: "public",
        payloadJson: {
          sessionId: activeSessionId,
          content: rolledPlayerContext || intent,
          narrative: outcomeText.trim(),
          moveName: lastRoll?.moveName ?? move?.name ?? moveName ?? undefined,
          moveId: lastRoll?.moveId ?? move?._id ?? undefined,
          stat: lastRoll?.rollLabel,
          statValue: lastRoll?.modifier,
          action: lastRoll?.action,
          challengeDice: lastRoll
            ? [lastRoll.challenge1, lastRoll.challenge2]
            : undefined,
          score: lastRoll ? getActionScore(lastRoll) : undefined,
          outcome: lastRoll ? getRollResultLabel(lastRoll.result) : undefined,
          momentumBurned: lastRoll?.momentumBurned,
          momentumResetValue: lastRoll?.momentumBurned
            ? momentumResetValue
            : undefined,
          matchedNegativeMomentum: lastRoll?.matchedNegativeMomentum,
          canBurnMomentum: Boolean(canBurnMomentum),
          burnOutcome:
            canBurnMomentum && burnOutcome !== undefined
              ? getRollResultLabel(burnOutcome)
              : undefined,
        },
      });
      onComplete?.();
      onClose();
    } catch (error) {
      setNarrateError(
        error instanceof Error ? error.message : "Could not save the outcome."
      );
    } finally {
      setSavingOutcome(false);
    }
  }, [
    actingCharacterId,
    addSceneEvent,
    activeSessionId,
    burnOutcome,
    campaignId,
    canBurnMomentum,
    characterId,
    currentSceneTitle,
    intent,
    lastRoll,
    move,
    moveName,
    momentumResetValue,
    onClose,
    onComplete,
    outcomeText,
    rolledPlayerContext,
    step,
  ]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{step === "move" ? "Make Your Move" : "Outcome"}</DialogTitle>
      <DialogContent dividers>
        {step === "move" && (
          <>
            {move ? (
              <>
                <Typography variant="subtitle2" mb={1.5}>
                  {move.name}
                </Typography>
                {characterOptions.length > 1 && (
                  <TextField
                    label="Acting Character"
                    select
                    size="small"
                    fullWidth
                    value={actingCharacterId}
                    onChange={(event) => setActingCharacterId(event.target.value)}
                    sx={{ mb: 1.5 }}
                  >
                    {characterOptions.map(([charId, character]) => (
                      <MenuItem key={charId} value={charId}>
                        {character.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                <MoveRollers
                  move={move}
                  initialPlayerContext={intent}
                  playerContext={playerContext}
                  onPlayerContextChange={setPlayerContext}
                  onRollComplete={handleRollComplete}
                />
              </>
            ) : (
              <Alert severity="info">
                {moveName
                  ? `Move "${moveName}" not found. Roll manually, then click Continue.`
                  : "No move identified. Roll manually, then click Continue."}
              </Alert>
            )}
          </>
        )}

        {step === "outcome" && (
          <Box display="flex" flexDirection="column" gap={1.5}>
            {lastRoll && (
              <>
                <RollDisplay roll={lastRoll} isExpanded />
                {lastRoll.matchedNegativeMomentum && (
                  <Alert severity="warning">
                    Negative momentum applied: your momentum matched the action
                    die, so the action die was cancelled before comparing the
                    score to the challenge dice.
                  </Alert>
                )}
                {canBurnMomentum && burnOutcome !== undefined && (
                  <Alert
                    severity="info"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        startIcon={<WhatshotIcon />}
                        onClick={handleBurnMomentum}
                        disabled={burningMomentum || narrateLoading || savingOutcome}
                      >
                        {burningMomentum ? "Burning..." : "Burn Momentum"}
                      </Button>
                    }
                  >
                    You can burn momentum {momentum} to improve this to{" "}
                    {getRollResultLabel(burnOutcome)}. Burning momentum replaces
                    the action score with your current momentum, then resets
                    momentum to {momentumResetValue}.
                  </Alert>
                )}
                {lastRoll.momentumBurned !== undefined && (
                  <Alert severity="success">
                    Momentum burned: score {lastRoll.momentumBurned}; result is
                    now {getRollResultLabel(lastRoll.result)}. Momentum reset to{" "}
                    {momentumResetValue}.
                  </Alert>
                )}
              </>
            )}
            <TextField
              label="Result"
              multiline
              minRows={5}
              fullWidth
              value={outcomeText}
              onChange={(event) => setOutcomeText(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              disabled={narrateLoading}
              placeholder="Write the outcome, narrate it with AI, or enter a rough prompt and elaborate it."
            />
            {narrateError && <Alert severity="error">{narrateError}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleAiNarrate}
                disabled={narrateLoading || !activeSessionId || !lastRoll}
              >
                Narrate Outcome
              </Button>
              <Button
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleElaborate}
                disabled={
                  narrateLoading ||
                  !activeSessionId ||
                  !lastRoll ||
                  !outcomeText.trim()
                }
              >
                Elaborate
              </Button>
            </Stack>
            {!activeSessionId && (
              <Alert severity="info">
                Start a session to generate outcome narration with AI.
              </Alert>
            )}
            {narrateLoading && (
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Narrating outcome…
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {step === "move" && !move && (
          <Button onClick={() => setStep("outcome")}>Continue</Button>
        )}
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        {step === "outcome" && (
          <Button
            variant="contained"
            onClick={handleDone}
            disabled={savingOutcome || narrateLoading || burningMomentum}
          >
            {savingOutcome ? "Saving…" : "Done"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function getBurnOutcome(
  momentum: number,
  challenge1: number,
  challenge2: number
): ROLL_RESULT {
  if (momentum > challenge1 && momentum > challenge2) return ROLL_RESULT.HIT;
  if (momentum <= challenge1 && momentum <= challenge2) return ROLL_RESULT.MISS;
  return ROLL_RESULT.WEAK_HIT;
}

function getActionScore(roll: StatRoll): number {
  if (roll.momentumBurned !== undefined) return roll.momentumBurned;
  return Math.min(
    10,
    (roll.matchedNegativeMomentum ? 0 : roll.action) +
      (roll.modifier ?? 0) +
      (roll.adds ?? 0)
  );
}
