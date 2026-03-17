import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import {
  AiCampaignContext,
  AiEventDocument,
  AiEventStatus,
  AiMode,
} from "api-calls/ai/_ai.type";

import { CampaignType } from "api-calls/campaign/_campaign.type";
import { useEffect, useState } from "react";
import { useStore } from "stores/store";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { useYjsToText } from "hooks/useYjsToText";
import { AiModeSelector } from "./AiModeSelector";
import { AiSuggestionCard } from "./AiSuggestionCard";
import { StoryGeneratorForm } from "./modes/StoryGeneratorForm";
import { StuckPlayerForm } from "./modes/StuckPlayerForm";
import { ActionElaboratorForm } from "./modes/ActionElaboratorForm";
import { SessionRecapForm } from "./modes/SessionRecapForm";
import { BookkeeperForm } from "./modes/BookkeeperForm";

function buildContext(
  gameSystem: GAME_SYSTEMS,
  store: ReturnType<typeof useStore.getState>
): AiCampaignContext {
  const campaign = store.campaigns.currentCampaign.currentCampaign;
  const character = store.characters.currentCharacter.currentCharacter;
  const trackMap =
    store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active];

  const activeVows = Object.values(trackMap?.[TrackTypes.Vow] ?? {}).map(
    (v) => ({
      label: v.label,
      difficulty: v.difficulty,
      value: v.value,
    })
  );

  const activeJourneys = Object.values(
    trackMap?.[TrackTypes.Journey] ?? {}
  ).map((j) => ({
    label: j.label,
    difficulty: j.difficulty,
    value: j.value,
  }));

  const characters = character
    ? [
        {
          name: character.name,
          stats: character.stats ?? {},
          conditionMeters: character.conditionMeters ?? {},
          momentum: character.momentum ?? 0,
        },
      ]
    : [];

  return {
    gameSystem:
      gameSystem === GAME_SYSTEMS.STARFORGED ? "starforged" : "ironsworn",
    campaignName: campaign?.name ?? "Unknown Campaign",
    campaignType: (campaign?.type ?? CampaignType.Solo) as
      | "solo"
      | "co-op"
      | "guided",
    activeVows,
    activeJourneys,
    characters,
    recentRolls: [],
  };
}

export function AiGuidePanel() {
  const [mode, setMode] = useState<AiMode>("storyGenerator");
  const [freeformInput, setFreeformInput] = useState("");

  const { gameSystem } = useGameSystem();
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const isRequesting = useStore((store) => store.ai.isRequesting);
  const events = useStore((store) => store.ai.events);
  const requestAi = useStore((store) => store.ai.requestAi);
  const updateEventStatus = useStore((store) => store.ai.updateEventStatus);
  const pendingMode = useStore((store) => store.ai.pendingMode);
  const pendingInput = useStore((store) => store.ai.pendingInput);
  const clearPending = useStore((store) => store.ai.clearPending);
  const openNoteContent = useStore((store) => store.notes.openNoteContent);
  const noteText = useYjsToText(
    mode === "sessionRecap" ? openNoteContent : undefined
  );

  useEffect(() => {
    if (pendingMode) {
      setMode(pendingMode);
      setFreeformInput(pendingInput ?? "");
      clearPending();
    }
  }, [pendingMode, pendingInput, clearPending]);

  const sortedEvents = Object.entries(events)
    .map(([id, event]) => ({ id, event }))
    .sort(
      (a, b) =>
        b.event.createdAt.getTime() - a.event.createdAt.getTime()
    );

  const handleGenerate = () => {
    if (!campaignId) return;

    const storeState = useStore.getState();
    const context: AiCampaignContext = {
      ...buildContext(gameSystem, storeState),
      freeformInput: freeformInput.trim() || undefined,
      noteText: mode === "sessionRecap" ? noteText : undefined,
    };

    const worldId = storeState.worlds.currentWorld.currentWorldId;
    requestAi({ mode, campaignId, context, worldId });
  };

  const handleUpdateStatus = (
    eventId: string,
    status: AiEventStatus,
    editedText?: string
  ) => {
    if (!campaignId) return;
    updateEventStatus({ eventId, campaignId, status, editedText });
  };

  const isGenerateDisabled =
    isRequesting ||
    !campaignId ||
    (mode === "actionElaborator" && !freeformInput.trim()) ||
    (mode === "bookkeeper" && !freeformInput.trim());

  if (!campaignId) {
    return (
      <Box p={2}>
        <Alert severity="info">
          Open a campaign to use the AI Guide.
        </Alert>
      </Box>
    );
  }

  return (
    <Stack spacing={0} sx={{ height: "100%", overflow: "hidden" }}>
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <AiModeSelector value={mode} onChange={(m) => { setMode(m); setFreeformInput(""); }} />
      </Box>

      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
        {mode === "storyGenerator" && (
          <StoryGeneratorForm
            objective={freeformInput}
            onObjectiveChange={setFreeformInput}
          />
        )}
        {mode === "stuckPlayer" && (
          <StuckPlayerForm
            situation={freeformInput}
            onSituationChange={setFreeformInput}
          />
        )}
        {mode === "actionElaborator" && (
          <ActionElaboratorForm
            action={freeformInput}
            onActionChange={setFreeformInput}
          />
        )}
        {mode === "sessionRecap" && (
          <SessionRecapForm hasNoteContent={!!noteText} />
        )}
        {mode === "bookkeeper" && (
          <BookkeeperForm
            sessionText={freeformInput}
            onSessionTextChange={setFreeformInput}
          />
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleGenerate}
          disabled={isGenerateDisabled}
          startIcon={
            isRequesting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <AutoFixHighIcon />
            )
          }
          sx={{ mt: 1.5 }}
        >
          {isRequesting ? "Generating…" : "Generate"}
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", p: 1.5 }}>
        {sortedEvents.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
            Your AI suggestions will appear here.
          </Typography>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Recent suggestions
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {sortedEvents.map(({ id, event }) => (
              <AiSuggestionCard
                key={id}
                eventId={id}
                event={event as AiEventDocument}
                campaignId={campaignId}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </>
        )}
      </Box>
    </Stack>
  );
}
