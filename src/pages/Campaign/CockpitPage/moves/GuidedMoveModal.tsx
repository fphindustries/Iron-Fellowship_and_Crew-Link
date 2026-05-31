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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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
import {
  ROLL_RESULT,
  ROLL_TYPE,
  StatRoll,
  TrackProgressRoll,
} from "types/DieRolls.type";
import { streamNarrative } from "api/ai/streamNarrative";
import { useAIGuideContext } from "hooks/useAIGuideContext";
import { NarrativeRequestPayload } from "types/aiGuide.types";
import { useAddSceneEventMutation } from "hooks/queries/useSceneEventsQuery";
import { useUpdateCharacterMutation } from "hooks/queries/useCharactersQuery";
import {
  useCreateCampaignTrackMutation,
  useUpdateCampaignTrackMutation,
} from "hooks/queries/useCampaignsQuery";
import { Difficulty, ProgressTrack, TrackStatus, TrackTypes } from "types/Track.type";
import { getDifficultyStep } from "functions/moveUtils";
import { getRoll } from "stores/appState/useRoller";
import { MarkdownRenderer } from "components/shared/MarkdownRenderer/MarkdownRenderer";
import { Datasworn } from "@datasworn/core";

interface GuidedMoveModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  intent: string;
  moveName?: string | null;
}

type GuidedRoll = StatRoll | TrackProgressRoll;
type SetCourseWeakHitChoice = "suffer_costs" | "face_complication";

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
  const campaignCharacterAssets = useStore(
    (store) => store.campaigns.currentCampaign.characters.characterAssets
  );
  const assetMap = useStore((store) => store.rules.assetMaps.assetMap);
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
  const uid = useStore((store) => store.auth.uid);
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const currentSceneTitle = useStore(
    (store) => store.aiGuide.state?.currentScene.title
  );
  const updateScene = useStore((store) => store.aiGuide.updateScene);
  const activeJourneyTracks = useStore(
    (store) =>
      store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active]?.[
        TrackTypes.Journey
      ] ?? {}
  );
  const guideContext = useAIGuideContext();
  const addSceneEvent = useAddSceneEventMutation(campaignId);
  const createCampaignTrack = useCreateCampaignTrackMutation(campaignId);
  const updateCampaignTrack = useUpdateCampaignTrackMutation(campaignId);

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
  const [lastRoll, setLastRoll] = useState<GuidedRoll>();
  const [outcomeText, setOutcomeText] = useState("");
  const [selectedJourneyTrackId, setSelectedJourneyTrackId] = useState("");
  const [newExpeditionName, setNewExpeditionName] = useState("");
  const [newExpeditionRank, setNewExpeditionRank] = useState<Difficulty>(
    Difficulty.Dangerous
  );
  const [expeditionWeakHitChoice, setExpeditionWeakHitChoice] = useState<
    "suffer_costs" | "face_peril"
  >("face_peril");
  const [setCourseWeakHitChoice, setSetCourseWeakHitChoice] =
    useState<SetCourseWeakHitChoice>("suffer_costs");
  const [finishMissChoice, setFinishMissChoice] = useState<
    "return" | "abandon"
  >("return");
  const wasOpenRef = useRef(false);
  const updateActingCharacter = useUpdateCharacterMutation(actingCharacterId);

  const characterOptions = useMemo(
    () => Object.entries(campaignCharacters),
    [campaignCharacters]
  );
  const journeyTrackOptions = useMemo(
    () => Object.entries(activeJourneyTracks),
    [activeJourneyTracks]
  );
  const isUndertakeExpedition =
    move?.name.toLowerCase() === "undertake an expedition";
  const isFinishExpedition =
    move?.name.toLowerCase() === "finish an expedition";
  const isSetCourse = move?.name.toLowerCase() === "set a course";
  const actingCharacter = actingCharacterId
    ? campaignCharacters[actingCharacterId]
    : undefined;
  const actingMomentum = actingCharacter?.momentum ?? momentum;
  const activeOutcomeRule = lastRoll
    ? getMoveOutcomeRule(move, lastRoll.result)
    : "";
  const selectedJourneyTrack = selectedJourneyTrackId
    ? activeJourneyTracks[selectedJourneyTrackId]
    : undefined;
  const actingGuideContext = useMemo(() => {
    const actingCharacter = actingCharacterId
      ? campaignCharacters[actingCharacterId]
      : undefined;
    if (!actingCharacter) return guideContext;

    const assetNames = (campaignCharacterAssets[actingCharacterId] ?? [])
      .map((asset) => assetMap[asset.id]?.name)
      .filter((name): name is string => !!name);
    const companionNames = Object.entries(campaignCharacters)
      .filter(([id]) => id !== actingCharacterId)
      .map(([, character]) => character.name)
      .filter(Boolean);

    return {
      ...guideContext,
      characterName: actingCharacter.name,
      characterPronouns: actingCharacter.pronouns,
      callsign: actingCharacter.callsign,
      characteristics: actingCharacter.characteristics,
      characterAssets: assetNames,
      campaignCharacterNames:
        companionNames.length > 0 ? companionNames : undefined,
    };
  }, [
    actingCharacterId,
    assetMap,
    campaignCharacterAssets,
    campaignCharacters,
    guideContext,
  ]);

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
    setSelectedJourneyTrackId("");
    setNewExpeditionName("");
    setNewExpeditionRank(Difficulty.Dangerous);
    setExpeditionWeakHitChoice("face_peril");
    setSetCourseWeakHitChoice("suffer_costs");
    setFinishMissChoice("return");
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

  const handleFinishExpeditionRoll = useCallback(() => {
    if (!selectedJourneyTrack) return;
    const challenge1 = getRoll(10);
    const challenge2 = getRoll(10);
    const trackProgress = Math.min(Math.floor(selectedJourneyTrack.value / 4), 10);
    let result = ROLL_RESULT.WEAK_HIT;
    if (trackProgress > challenge1 && trackProgress > challenge2) {
      result = ROLL_RESULT.HIT;
    } else if (trackProgress <= challenge1 && trackProgress <= challenge2) {
      result = ROLL_RESULT.MISS;
    }

    const roll: TrackProgressRoll = {
      type: ROLL_TYPE.TRACK_PROGRESS,
      rollLabel: selectedJourneyTrack.label,
      timestamp: new Date(),
      characterId: actingCharacterId || characterId || null,
      uid,
      gmsOnly: false,
      challenge1,
      challenge2,
      trackProgress,
      result,
      trackType: TrackTypes.Journey,
      moveId: move?._id,
    };

    const context =
      playerContext.trim() || `Finish expedition: ${selectedJourneyTrack.label}`;
    setLastRoll(roll);
    setRolledPlayerContext(context);
    setOutcomeText("");
    setNarrateError("");
    setStep("outcome");
  }, [
    actingCharacterId,
    characterId,
    move,
    playerContext,
    selectedJourneyTrack,
    uid,
  ]);

  const burnOutcome =
    isStatRoll(lastRoll) && actingMomentum > 0
      ? getBurnOutcome(actingMomentum, lastRoll.challenge1, lastRoll.challenge2)
      : undefined;
  const canBurnMomentum =
    isStatRoll(lastRoll) &&
    burnOutcome !== undefined &&
    !lastRoll.momentumBurned &&
    actingMomentum > 0 &&
    burnOutcome < lastRoll.result;
  const momentumCannotImprove =
    isStatRoll(lastRoll) &&
    !lastRoll.momentumBurned &&
    actingMomentum > 0 &&
    lastRoll.result !== ROLL_RESULT.HIT &&
    burnOutcome !== undefined &&
    burnOutcome >= lastRoll.result;

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
          characterId: actingCharacterId || characterId || undefined,
          campaignId: campaignId ?? undefined,
          moveEvent: {
            moveName: isStatRoll(lastRoll)
              ? lastRoll.moveName ?? move?.name ?? "Unknown Move"
              : move?.name ?? "Finish an Expedition",
            moveId: lastRoll.moveId ?? move?._id ?? "",
            stat: isStatRoll(lastRoll) ? lastRoll.rollLabel : "progress",
            statValue: isStatRoll(lastRoll)
              ? lastRoll.modifier
              : lastRoll.trackProgress,
            playerContext: rolledPlayerContext,
            outcome: lastRoll.result,
            action: isStatRoll(lastRoll) ? lastRoll.action : undefined,
            challengeDice: [lastRoll.challenge1, lastRoll.challenge2],
            score: isStatRoll(lastRoll)
              ? getActionScore(lastRoll)
              : lastRoll.trackProgress,
            outcomeRule: getMoveOutcomeRule(move, lastRoll.result),
          },
          prompt,
          gameContext: actingGuideContext,
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
      actingCharacterId,
      actingGuideContext,
      campaignId,
      characterId,
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
    if (
      !isStatRoll(lastRoll) ||
      burnOutcome === undefined ||
      !actingCharacterId
    ) {
      return;
    }

    setBurningMomentum(true);
    setNarrateError("");
    try {
      await updateActingCharacter.mutateAsync({ momentum: momentumResetValue });
      setLastRoll({
        ...lastRoll,
        momentumBurned: actingMomentum,
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
    actingMomentum,
    burnOutcome,
    lastRoll,
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
      const expeditionResult = await resolveExpeditionProgress({
        createCampaignTrack,
        updateCampaignTrack,
        isUndertakeExpedition,
        lastRoll: isStatRoll(lastRoll) ? lastRoll : undefined,
        selectedJourneyTrackId,
        selectedJourneyTrack,
        newExpeditionName,
        newExpeditionRank,
      });
      const finishResult = await resolveFinishExpedition({
        updateCampaignTrack,
        isFinishExpedition,
        lastRoll,
        selectedJourneyTrackId,
        selectedJourneyTrack,
        finishMissChoice,
      });
      const setCourseMomentumResult =
        isSetCourse && isStatRoll(lastRoll) && lastRoll.result === ROLL_RESULT.HIT
          ? await applySetCourseMomentumReward({
              actingCharacterId,
              actingMomentum:
                lastRoll.momentumBurned !== undefined
                  ? momentumResetValue
                  : actingMomentum,
              updateActingCharacter,
            })
          : undefined;
      const setCourseDestination =
        isSetCourse &&
        lastRoll &&
        (lastRoll.result === ROLL_RESULT.HIT ||
          lastRoll.result === ROLL_RESULT.WEAK_HIT)
          ? getSetCourseDestination(rolledPlayerContext || intent)
          : "";

      await addSceneEvent.mutateAsync({
        sessionId: activeSessionId ?? null,
        sceneId: currentSceneTitle?.trim() || "current-scene",
        type: lastRoll ? "move_roll" : "player_action",
        actorId: actingCharacterId || characterId || null,
        visibility: "public",
        payloadJson: {
          sessionId: activeSessionId,
          content: rolledPlayerContext || intent,
          narrative: outcomeText.trim(),
          moveName:
            lastRoll && isStatRoll(lastRoll)
              ? lastRoll.moveName ?? move?.name ?? moveName ?? undefined
              : move?.name ?? moveName ?? undefined,
          moveId: lastRoll?.moveId ?? move?._id ?? undefined,
          stat: lastRoll
            ? isStatRoll(lastRoll)
              ? lastRoll.rollLabel
              : "progress"
            : undefined,
          statValue: lastRoll
            ? isStatRoll(lastRoll)
              ? lastRoll.modifier
              : lastRoll.trackProgress
            : undefined,
          action:
            lastRoll && isStatRoll(lastRoll) ? lastRoll.action : undefined,
          challengeDice: lastRoll
            ? [lastRoll.challenge1, lastRoll.challenge2]
            : undefined,
          score: lastRoll
            ? isStatRoll(lastRoll)
              ? getActionScore(lastRoll)
              : lastRoll.trackProgress
            : undefined,
          outcome: lastRoll ? getRollResultLabel(lastRoll.result) : undefined,
          momentumBurned:
            lastRoll && isStatRoll(lastRoll)
              ? lastRoll.momentumBurned
              : undefined,
          momentumResetValue:
            lastRoll && isStatRoll(lastRoll) && lastRoll.momentumBurned
            ? momentumResetValue
            : undefined,
          matchedNegativeMomentum:
            lastRoll && isStatRoll(lastRoll)
              ? lastRoll.matchedNegativeMomentum
              : undefined,
          canBurnMomentum: Boolean(canBurnMomentum),
          burnOutcome:
            canBurnMomentum && burnOutcome !== undefined
              ? getRollResultLabel(burnOutcome)
              : undefined,
          expeditionTrackId: expeditionResult?.trackId,
          expeditionName: expeditionResult?.trackLabel,
          expeditionProgressMarked: expeditionResult?.progressMarked,
          expeditionProgressBefore: expeditionResult?.previousValue,
          expeditionProgressAfter: expeditionResult?.newValue,
          expeditionWeakHitChoice:
            isUndertakeExpedition &&
            lastRoll?.result === ROLL_RESULT.WEAK_HIT
              ? expeditionWeakHitChoice
              : undefined,
          finishExpeditionTrackId: finishResult?.trackId,
          finishExpeditionName: finishResult?.trackLabel,
          finishExpeditionAction: finishResult?.action,
          finishExpeditionProgressBefore: finishResult?.previousValue,
          finishExpeditionProgressAfter: finishResult?.newValue,
          finishExpeditionRankBefore: finishResult?.previousDifficulty,
          finishExpeditionRankAfter: finishResult?.newDifficulty,
          setCourseWeakHitChoice:
            isSetCourse && lastRoll?.result === ROLL_RESULT.WEAK_HIT
              ? setCourseWeakHitChoice
              : undefined,
          setCourseMomentumBefore: setCourseMomentumResult?.previousValue,
          setCourseMomentumAfter: setCourseMomentumResult?.newValue,
          setCourseDestination: setCourseDestination || undefined,
        },
      });
      if (campaignId && setCourseDestination) {
        await updateScene(campaignId, {
          title: setCourseDestination,
          description:
            outcomeText.trim() ||
            activeOutcomeRule ||
            `Arrived at ${setCourseDestination}.`,
        });
      }
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
    activeOutcomeRule,
    burnOutcome,
    campaignId,
    canBurnMomentum,
    characterId,
    currentSceneTitle,
    createCampaignTrack,
    expeditionWeakHitChoice,
    finishMissChoice,
    intent,
    actingMomentum,
    isFinishExpedition,
    isSetCourse,
    isUndertakeExpedition,
    lastRoll,
    move,
    moveName,
    momentumResetValue,
    newExpeditionName,
    newExpeditionRank,
    onClose,
    onComplete,
    outcomeText,
    rolledPlayerContext,
    selectedJourneyTrack,
    selectedJourneyTrackId,
    setCourseWeakHitChoice,
    step,
    updateActingCharacter,
    updateCampaignTrack,
    updateScene,
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
                {(isUndertakeExpedition || isFinishExpedition) && (
                  <Box
                    sx={{
                      mb: 1.5,
                      p: 1.5,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography variant="subtitle2" mb={0.75}>
                      Expedition Track
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={1.5}>
                      {isFinishExpedition
                        ? "Finish an Expedition rolls against the progress you have marked on an active expedition."
                        : "Undertake an Expedition is resolved in segments. Choose an active expedition or create one so progress can be marked when you reach a waypoint."}
                    </Typography>
                    {journeyTrackOptions.length > 0 && (
                      <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                        <InputLabel>Active Expedition</InputLabel>
                        <Select
                          label="Active Expedition"
                          value={selectedJourneyTrackId}
                          onChange={(event) => {
                            setSelectedJourneyTrackId(event.target.value);
                            if (event.target.value) setNewExpeditionName("");
                          }}
                        >
                          {isUndertakeExpedition && (
                            <MenuItem value="">Create a new expedition</MenuItem>
                          )}
                          {journeyTrackOptions.map(([trackId, track]) => (
                            <MenuItem key={trackId} value={trackId}>
                              {track.label} - {track.difficulty},{" "}
                              {Math.floor(track.value / 4)}/10 boxes
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    {isUndertakeExpedition && !selectedJourneyTrackId && (
                      <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                        <TextField
                          label="Expedition name"
                          size="small"
                          fullWidth
                          value={newExpeditionName}
                          onChange={(event) =>
                            setNewExpeditionName(event.target.value)
                          }
                        />
                        <TextField
                          label="Rank"
                          select
                          size="small"
                          value={newExpeditionRank}
                          onChange={(event) =>
                            setNewExpeditionRank(event.target.value as Difficulty)
                          }
                          sx={{ minWidth: 150 }}
                        >
                          {Object.values(Difficulty).map((rank) => (
                            <MenuItem key={rank} value={rank}>
                              {rank}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>
                    )}
                  </Box>
                )}
                {isFinishExpedition && !selectedJourneyTrackId ? (
                  <Alert severity="info">
                    Choose an active expedition before rolling to finish it.
                  </Alert>
                ) : isFinishExpedition ? (
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>
                      What does reaching the destination look like?
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Describe the destination or objective..."
                      value={playerContext}
                      onChange={(event) => setPlayerContext(event.target.value)}
                      onKeyDown={(event) => event.stopPropagation()}
                      sx={{ mb: 1 }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleFinishExpeditionRoll}
                      disabled={!selectedJourneyTrack}
                    >
                      Roll Progress
                    </Button>
                  </Box>
                ) : isUndertakeExpedition &&
                  !selectedJourneyTrackId &&
                  !newExpeditionName.trim() ? (
                  <Alert severity="info">
                    Name the expedition or choose an active expedition before
                    rolling.
                  </Alert>
                ) : (
                <MoveRollers
                  move={move}
                  initialPlayerContext={intent}
                  playerContext={playerContext}
                  onPlayerContextChange={setPlayerContext}
                  onRollComplete={handleRollComplete}
                />
                )}
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
                {isStatRoll(lastRoll) && lastRoll.matchedNegativeMomentum && (
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
                    You can burn momentum {actingMomentum} to improve this to{" "}
                    {getRollResultLabel(burnOutcome)}. Burning momentum replaces
                    the action score with your current momentum, then resets
                    momentum to {momentumResetValue}.
                  </Alert>
                )}
                {momentumCannotImprove && burnOutcome !== undefined && (
                  <Alert severity="info">
                    Momentum {actingMomentum} cannot improve this result. To
                    burn momentum, your momentum must beat at least one
                    challenge die and improve the outcome.
                  </Alert>
                )}
                {isStatRoll(lastRoll) && lastRoll.momentumBurned !== undefined && (
                  <Alert severity="success">
                    Momentum burned: score {lastRoll.momentumBurned}; result is
                    now {getRollResultLabel(lastRoll.result)}. Momentum reset to{" "}
                    {momentumResetValue}.
                  </Alert>
                )}
                <MoveOutcomeRule move={move} roll={lastRoll} />
                {isSetCourse && (
                  <SetCourseOutcomePrompt
                    roll={isStatRoll(lastRoll) ? lastRoll : undefined}
                    momentum={
                      isStatRoll(lastRoll) && lastRoll.momentumBurned !== undefined
                        ? momentumResetValue
                        : actingMomentum
                    }
                    weakHitChoice={setCourseWeakHitChoice}
                    onWeakHitChoiceChange={setSetCourseWeakHitChoice}
                  />
                )}
                {isUndertakeExpedition && (
                  <ExpeditionOutcomePrompt
                    roll={isStatRoll(lastRoll) ? lastRoll : undefined}
                    selectedTrack={selectedJourneyTrack}
                    newExpeditionName={newExpeditionName}
                    newExpeditionRank={newExpeditionRank}
                    weakHitChoice={expeditionWeakHitChoice}
                    onWeakHitChoiceChange={setExpeditionWeakHitChoice}
                  />
                )}
                {isFinishExpedition && (
                  <FinishExpeditionOutcomePrompt
                    roll={isTrackProgressRoll(lastRoll) ? lastRoll : undefined}
                    selectedTrack={selectedJourneyTrack}
                    missChoice={finishMissChoice}
                    onMissChoiceChange={setFinishMissChoice}
                  />
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

interface ExpeditionProgressResult {
  trackId: string;
  trackLabel: string;
  progressMarked: number;
  previousValue: number;
  newValue: number;
}

interface FinishExpeditionResult {
  trackId: string;
  trackLabel: string;
  action: "complete" | "return" | "abandon";
  previousValue: number;
  newValue: number;
  previousDifficulty: Difficulty;
  newDifficulty: Difficulty;
}

interface MomentumRewardResult {
  previousValue: number;
  newValue: number;
}

async function applySetCourseMomentumReward(params: {
  actingCharacterId: string;
  actingMomentum: number;
  updateActingCharacter: ReturnType<typeof useUpdateCharacterMutation>;
}): Promise<MomentumRewardResult | undefined> {
  const { actingCharacterId, actingMomentum, updateActingCharacter } = params;
  if (!actingCharacterId) return undefined;

  const newValue = Math.min(10, actingMomentum + 1);
  if (newValue === actingMomentum) return undefined;

  await updateActingCharacter.mutateAsync({ momentum: newValue });
  useStore.setState((store) => {
    const campaignCharacter =
      store.campaigns.currentCampaign.characters.characterMap[actingCharacterId];
    if (campaignCharacter) campaignCharacter.momentum = newValue;

    const character = store.characters.characterMap[actingCharacterId];
    if (character) character.momentum = newValue;

    if (store.characters.currentCharacter.currentCharacterId === actingCharacterId) {
      const current = store.characters.currentCharacter.currentCharacter;
      if (current) current.momentum = newValue;
    }
  });

  return { previousValue: actingMomentum, newValue };
}

async function resolveExpeditionProgress(params: {
  createCampaignTrack: ReturnType<typeof useCreateCampaignTrackMutation>;
  updateCampaignTrack: ReturnType<typeof useUpdateCampaignTrackMutation>;
  isUndertakeExpedition: boolean;
  lastRoll?: StatRoll;
  selectedJourneyTrackId: string;
  selectedJourneyTrack?: ProgressTrack;
  newExpeditionName: string;
  newExpeditionRank: Difficulty;
}): Promise<ExpeditionProgressResult | undefined> {
  const {
    createCampaignTrack,
    updateCampaignTrack,
    isUndertakeExpedition,
    lastRoll,
    selectedJourneyTrackId,
    selectedJourneyTrack,
    newExpeditionName,
    newExpeditionRank,
  } = params;

  if (
    !isUndertakeExpedition ||
    !lastRoll ||
    (lastRoll.result !== ROLL_RESULT.HIT &&
      lastRoll.result !== ROLL_RESULT.WEAK_HIT)
  ) {
    return undefined;
  }

  let trackId = selectedJourneyTrackId;
  let track: ProgressTrack | undefined = selectedJourneyTrack;
  if (!trackId) {
    const newTrack: ProgressTrack = {
      label: newExpeditionName.trim() || "Expedition",
      type: TrackTypes.Journey,
      difficulty: newExpeditionRank,
      value: 0,
      status: TrackStatus.Active,
      createdDate: new Date(),
    };
    const row = await createCampaignTrack.mutateAsync({
      type: TrackTypes.Journey,
      dataJson: newTrack,
    });
    trackId = String((row as { id?: unknown })?.id ?? "");
    track = newTrack;
  }

  if (!trackId || !track) return undefined;

  const progressMarked = getDifficultyStep(track.difficulty);
  const previousValue = track.value;
  const newValue = Math.min(40, previousValue + progressMarked);
  await updateCampaignTrack.mutateAsync({
    trackId,
    dataJson: { value: newValue },
  });

  return {
    trackId,
    trackLabel: track.label,
    progressMarked,
    previousValue,
    newValue,
  };
}

async function resolveFinishExpedition(params: {
  updateCampaignTrack: ReturnType<typeof useUpdateCampaignTrackMutation>;
  isFinishExpedition: boolean;
  lastRoll?: GuidedRoll;
  selectedJourneyTrackId: string;
  selectedJourneyTrack?: ProgressTrack;
  finishMissChoice: "return" | "abandon";
}): Promise<FinishExpeditionResult | undefined> {
  const {
    updateCampaignTrack,
    isFinishExpedition,
    lastRoll,
    selectedJourneyTrackId,
    selectedJourneyTrack,
    finishMissChoice,
  } = params;

  if (
    !isFinishExpedition ||
    !isTrackProgressRoll(lastRoll) ||
    !selectedJourneyTrackId ||
    !selectedJourneyTrack
  ) {
    return undefined;
  }

  const previousValue = selectedJourneyTrack.value;
  const previousDifficulty = selectedJourneyTrack.difficulty;
  if (lastRoll.result === ROLL_RESULT.HIT || lastRoll.result === ROLL_RESULT.WEAK_HIT) {
    await updateCampaignTrack.mutateAsync({
      trackId: selectedJourneyTrackId,
      dataJson: { status: TrackStatus.Completed },
    });
    return {
      trackId: selectedJourneyTrackId,
      trackLabel: selectedJourneyTrack.label,
      action: "complete",
      previousValue,
      newValue: previousValue,
      previousDifficulty,
      newDifficulty: previousDifficulty,
    };
  }

  if (finishMissChoice === "return") {
    const newDifficulty = getNextDifficulty(previousDifficulty);
    await updateCampaignTrack.mutateAsync({
      trackId: selectedJourneyTrackId,
      dataJson: { value: 4, difficulty: newDifficulty },
    });
    return {
      trackId: selectedJourneyTrackId,
      trackLabel: selectedJourneyTrack.label,
      action: "return",
      previousValue,
      newValue: 4,
      previousDifficulty,
      newDifficulty,
    };
  }

  await updateCampaignTrack.mutateAsync({
    trackId: selectedJourneyTrackId,
    dataJson: { status: TrackStatus.Completed },
  });
  return {
    trackId: selectedJourneyTrackId,
    trackLabel: selectedJourneyTrack.label,
    action: "abandon",
    previousValue,
    newValue: previousValue,
    previousDifficulty,
    newDifficulty: previousDifficulty,
  };
}

function ExpeditionOutcomePrompt({
  roll,
  selectedTrack,
  newExpeditionName,
  newExpeditionRank,
  weakHitChoice,
  onWeakHitChoiceChange,
}: {
  roll?: StatRoll;
  selectedTrack?: ProgressTrack;
  newExpeditionName: string;
  newExpeditionRank: Difficulty;
  weakHitChoice: "suffer_costs" | "face_peril";
  onWeakHitChoiceChange: (choice: "suffer_costs" | "face_peril") => void;
}) {
  if (!roll) return null;
  const trackLabel = selectedTrack?.label || newExpeditionName.trim() || "Expedition";
  const rank = selectedTrack?.difficulty ?? newExpeditionRank;
  const marked = getDifficultyStep(rank);

  if (roll.result === ROLL_RESULT.HIT) {
    return (
      <Alert severity="success">
        {trackLabel}: reach a waypoint, envision it, and mark progress per rank
        ({marked} ticks).
      </Alert>
    );
  }

  if (roll.result === ROLL_RESULT.WEAK_HIT) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 1 }}>
          {trackLabel}: reach a waypoint and mark progress ({marked} ticks),
          but the progress costs you. Choose how the cost enters play.
        </Alert>
        <TextField
          label="Weak hit cost"
          select
          size="small"
          fullWidth
          value={weakHitChoice}
          onChange={(event) =>
            onWeakHitChoiceChange(
              event.target.value as "suffer_costs" | "face_peril"
            )
          }
        >
          <MenuItem value="face_peril">Face a peril at the waypoint</MenuItem>
          <MenuItem value="suffer_costs">
            Suffer costs en route (-2 or two -1 suffer moves)
          </MenuItem>
        </TextField>
      </Box>
    );
  }

  return (
    <Alert severity="error">
      You are waylaid by a crisis or arrive to immediate hardship. Do not mark
      progress, and Pay the Price.
    </Alert>
  );
}

function FinishExpeditionOutcomePrompt({
  roll,
  selectedTrack,
  missChoice,
  onMissChoiceChange,
}: {
  roll?: TrackProgressRoll;
  selectedTrack?: ProgressTrack;
  missChoice: "return" | "abandon";
  onMissChoiceChange: (choice: "return" | "abandon") => void;
}) {
  if (!roll || !selectedTrack) return null;

  if (roll.result === ROLL_RESULT.HIT) {
    return (
      <Alert severity="success">
        {selectedTrack.label}: the expedition is complete. Envision the destination
        and mark discovery legacy progress as appropriate.
      </Alert>
    );
  }

  if (roll.result === ROLL_RESULT.WEAK_HIT) {
    return (
      <Alert severity="warning">
        {selectedTrack.label}: the expedition is complete, but there is an
        unforeseen complication. Mark discovery legacy progress as appropriate.
      </Alert>
    );
  }

  return (
    <Box>
      <Alert severity="error" sx={{ mb: 1 }}>
        {selectedTrack.label}: the expedition fails. Choose whether to abandon it,
        or push on by clearing progress to one box and raising the rank.
      </Alert>
      <TextField
        label="Miss result"
        select
        size="small"
        fullWidth
        value={missChoice}
        onChange={(event) =>
          onMissChoiceChange(event.target.value as "return" | "abandon")
        }
      >
        <MenuItem value="return">
          Return and try again: clear progress to one box and raise rank
        </MenuItem>
        <MenuItem value="abandon">Abandon the expedition</MenuItem>
      </TextField>
    </Box>
  );
}

function MoveOutcomeRule({
  move,
  roll,
}: {
  move?: Datasworn.Move;
  roll?: GuidedRoll;
}) {
  if (!move || !roll) return null;
  const outcomeText = getMoveOutcomeRule(move, roll.result);
  if (!outcomeText) return null;

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        p: 1.25,
        bgcolor: "background.default",
      }}
    >
      <Typography variant="subtitle2" mb={0.5}>
        Move Outcome
      </Typography>
      <MarkdownRenderer markdown={outcomeText} typographyVariant="body2" />
    </Box>
  );
}

function SetCourseOutcomePrompt({
  roll,
  momentum,
  weakHitChoice,
  onWeakHitChoiceChange,
}: {
  roll?: StatRoll;
  momentum: number;
  weakHitChoice: SetCourseWeakHitChoice;
  onWeakHitChoiceChange: (choice: SetCourseWeakHitChoice) => void;
}) {
  if (!roll) return null;

  if (roll.result === ROLL_RESULT.HIT) {
    return (
      <Alert severity="success">
        Set a Course: take +1 momentum when you save this move
        {momentum < 10 ? ` (${momentum} -> ${Math.min(10, momentum + 1)}).` : "."}
      </Alert>
    );
  }

  if (roll.result === ROLL_RESULT.WEAK_HIT) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 1 }}>
          Set a Course: choose the cost or complication you face.
        </Alert>
        <TextField
          label="Weak hit cost"
          select
          size="small"
          fullWidth
          value={weakHitChoice}
          onChange={(event) =>
            onWeakHitChoiceChange(event.target.value as SetCourseWeakHitChoice)
          }
        >
          <MenuItem value="suffer_costs">
            Suffer costs en route: make a suffer move (-2), or two suffer moves
            (-1)
          </MenuItem>
          <MenuItem value="face_complication">
            Face a complication at the destination
          </MenuItem>
        </TextField>
      </Box>
    );
  }

  return (
    <Alert severity="error">
      Set a Course: you are waylaid by a significant threat and must Pay the
      Price. If you overcome it, you may push on safely to your destination.
    </Alert>
  );
}

function isStatRoll(roll?: GuidedRoll): roll is StatRoll {
  return roll?.type === ROLL_TYPE.STAT;
}

function isTrackProgressRoll(roll?: GuidedRoll): roll is TrackProgressRoll {
  return roll?.type === ROLL_TYPE.TRACK_PROGRESS;
}

function getNextDifficulty(difficulty: Difficulty): Difficulty {
  switch (difficulty) {
    case Difficulty.Troublesome:
      return Difficulty.Dangerous;
    case Difficulty.Dangerous:
      return Difficulty.Formidable;
    case Difficulty.Formidable:
      return Difficulty.Extreme;
    case Difficulty.Extreme:
    case Difficulty.Epic:
      return Difficulty.Epic;
  }
}

function getOutcomeKey(result: ROLL_RESULT): "strong_hit" | "weak_hit" | "miss" {
  if (result === ROLL_RESULT.HIT) return "strong_hit";
  if (result === ROLL_RESULT.WEAK_HIT) return "weak_hit";
  return "miss";
}

function getMoveOutcomeRule(move: Datasworn.Move | undefined, result: ROLL_RESULT): string {
  const outcomes = move?.outcomes as unknown as
    | Record<string, { text?: string }>
    | undefined;
  return outcomes?.[getOutcomeKey(result)]?.text ?? "";
}

function getSetCourseDestination(intentText: string): string {
  const normalized = intentText
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^set a course\s*(to|for|toward|towards)?\s*/i, "")
    .replace(/^travel\s*(to|for|toward|towards)?\s*/i, "")
    .replace(/^head\s*(to|for|toward|towards)?\s*/i, "")
    .replace(/^go\s*(to|for|toward|towards)?\s*/i, "");
  const destination = normalized.split(/[.;\n]/)[0]?.trim() ?? "";
  return destination || "Destination";
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
