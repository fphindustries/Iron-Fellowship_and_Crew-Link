import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import BuildIcon from "@mui/icons-material/Build";
import { useEffect, useState } from "react";
import { useStore } from "stores/store";
import { CampaignType } from "types/Campaign.type";
import { AIGuideProposal } from "types/AIGuideState.type";
import { AiCampaignContext, AiGuidedMode } from "types/AI.type";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { useAIGuideQueue } from "hooks/useAIGuideQueue";
import { BookkeeperOutput } from "types/AI.type";
import { useApplyBookkeeperSuggestion } from "hooks/useApplyBookkeeperSuggestion";

function buildContext(
  gameSystem: GAME_SYSTEMS,
  store: ReturnType<typeof useStore.getState>,
  freeformInput?: string
): AiCampaignContext {
  const campaign = store.campaigns.currentCampaign.currentCampaign;
  const character = store.characters.currentCharacter.currentCharacter;
  const trackMap =
    store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active];

  const activeVows = Object.values(trackMap?.[TrackTypes.Vow] ?? {}).map(
    (v) => ({ label: v.label, difficulty: v.difficulty, value: v.value })
  );
  const activeJourneys = Object.values(
    trackMap?.[TrackTypes.Journey] ?? {}
  ).map((j) => ({ label: j.label, difficulty: j.difficulty, value: j.value }));

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
    gameSystem: gameSystem === GAME_SYSTEMS.STARFORGED ? "starforged" : "ironsworn",
    campaignName: campaign?.name ?? "Unknown Campaign",
    campaignType: "ai-guided",
    activeVows,
    activeJourneys,
    characters,
    recentRolls: [],
    freeformInput,
  };
}

// ── Mode config ────────────────────────────────────────────────────────────

const MODE_LABELS: Record<AiGuidedMode, string> = {
  sceneFrame: "Frame Scene",
  askOrAnswer: "Ask / Answer",
  moveSuggestion: "Suggest Move",
  outcomeNarration: "Narrate Outcome",
  priceProposal: "Pay the Price",
  oracleInterpretation: "Interpret Oracle",
  clockAdvance: "Advance Clock",
  sceneChallengeGuidance: "Scene Challenge",
  bookkeepingProposal: "Bookkeeping",
  actionSuggestions: "Action Suggestions",
  intentToMove: "Move Mapping",
  spotlightNudge: "Spotlight Nudge",
};

// Modes available in the manual request bar
const MANUAL_MODES: AiGuidedMode[] = [
  "sceneFrame",
  "askOrAnswer",
  "moveSuggestion",
  "outcomeNarration",
  "clockAdvance",
  "bookkeepingProposal",
];

// ── Structured data renderers ──────────────────────────────────────────────

interface PriceProposalData {
  consequenceType?: string;
  severity?: string;
  narrative?: string;
  mechanicalEffect?: string | null;
}

interface ClockAdvanceData {
  clockId?: string | null;
  clockLabel?: string | null;
  advanceBy?: number;
  narrativeSignal?: string;
  triggeredConsequence?: string | null;
}

function PriceProposalDetails(props: { data: PriceProposalData }) {
  const { data } = props;
  return (
    <Box sx={{ mt: 0.5 }}>
      {data.consequenceType && (
        <Box display="flex" gap={0.5} flexWrap="wrap" mb={0.5}>
          <Chip label={data.consequenceType} size="small" />
          {data.severity && <Chip label={data.severity} size="small" variant="outlined" />}
        </Box>
      )}
      {data.mechanicalEffect && (
        <Typography variant="caption" color="warning.main" display="block">
          Mechanical effect: {data.mechanicalEffect}
        </Typography>
      )}
    </Box>
  );
}

function ClockAdvanceDetails(props: {
  data: ClockAdvanceData;
  campaignId: string;
  onApplied: () => void;
}) {
  const { data, campaignId, onApplied } = props;
  const applyClockAdvance = useStore((s) => s.aiGuide.applyClockAdvance);
  const [applied, setApplied] = useState(false);

  if (!data.clockLabel && !data.clockId) return null;

  const handleApply = async () => {
    await applyClockAdvance(
      campaignId,
      data.clockId ?? null,
      data.clockLabel ?? null,
      data.advanceBy ?? 1
    );
    setApplied(true);
    onApplied();
  };

  return (
    <Box sx={{ mt: 0.5 }}>
      {data.clockLabel && (
        <Typography variant="caption" display="block">
          Clock: <strong>{data.clockLabel}</strong>
          {data.advanceBy !== undefined && ` +${data.advanceBy}`}
        </Typography>
      )}
      {data.triggeredConsequence && (
        <Typography variant="caption" color="error.main" display="block">
          Triggered: {data.triggeredConsequence}
        </Typography>
      )}
      {!applied && (
        <Button
          size="small"
          startIcon={<BuildIcon />}
          onClick={handleApply}
          sx={{ mt: 0.5 }}
        >
          Apply Clock Advance
        </Button>
      )}
      {applied && (
        <Typography variant="caption" color="success.main">
          Clock updated
        </Typography>
      )}
    </Box>
  );
}

function BookkeepingDetails(props: {
  data: BookkeeperOutput;
  onApply: () => void;
  applied: boolean;
}) {
  const { data, onApply, applied } = props;
  const hasChanges =
    data.vowUpdates?.length ||
    data.npcUpdates?.length ||
    data.newNPCs?.length ||
    data.locationUpdates?.length ||
    data.canonFacts?.length;

  if (!hasChanges) return null;

  return (
    <Box sx={{ mt: 0.5 }}>
      {data.canonFacts?.length > 0 && (
        <Typography variant="caption" display="block">
          Canon facts: {data.canonFacts.join("; ")}
        </Typography>
      )}
      {data.vowUpdates?.length > 0 && (
        <Typography variant="caption" display="block">
          Vow updates: {data.vowUpdates.map((v) => v.label).join(", ")}
        </Typography>
      )}
      {data.npcUpdates?.length > 0 && (
        <Typography variant="caption" display="block">
          NPC updates: {data.npcUpdates.map((n) => n.name).join(", ")}
        </Typography>
      )}
      {data.newNPCs?.length > 0 && (
        <Typography variant="caption" display="block">
          New NPCs: {data.newNPCs.map((n) => n.name).join(", ")}
        </Typography>
      )}
      {!applied && (
        <Button
          size="small"
          startIcon={<BuildIcon />}
          onClick={onApply}
          sx={{ mt: 0.5 }}
        >
          Apply to Game
        </Button>
      )}
      {applied && (
        <Typography variant="caption" color="success.main">
          Applied to campaign
        </Typography>
      )}
    </Box>
  );
}

// ── Proposal card ──────────────────────────────────────────────────────────

function ProposalCard(props: {
  proposal: AIGuideProposal;
  campaignId: string;
  onAccept: () => void;
  onDismiss: () => void;
  onTriggerBookkeeping: () => void;
}) {
  const { proposal, campaignId, onAccept, onDismiss, onTriggerBookkeeping } = props;
  const applyBookkeeperSuggestion = useApplyBookkeeperSuggestion();
  const addCanonFact = useStore((s) => s.aiGuide.addCanonFact);
  const [bookkeepingApplied, setBookkeepingApplied] = useState(false);

  if (!proposal.content) {
    return (
      <Box
        sx={{
          p: 1.5,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <CircularProgress size={14} />
        <Typography variant="body2" color="text.secondary">
          {MODE_LABELS[proposal.mode]?.toLowerCase() ?? "responding"}…
        </Typography>
      </Box>
    );
  }

  const isPending = proposal.status === "pending";
  const structured = proposal.structuredData as Record<string, unknown> | undefined;

  const handleApplyBookkeeping = async () => {
    const bk = proposal.structuredData as BookkeeperOutput;
    // Apply vow updates
    for (const v of bk.vowUpdates ?? []) {
      await applyBookkeeperSuggestion({
        type: "vowUpdate",
        data: { label: v.label, suggestedProgress: v.suggestedProgress, notes: v.notes },
      });
    }
    // Apply NPC updates
    for (const n of bk.npcUpdates ?? []) {
      await applyBookkeeperSuggestion({ type: "npcUpdate", data: n });
    }
    // Create new NPCs
    for (const n of bk.newNPCs ?? []) {
      await applyBookkeeperSuggestion({ type: "newNPC", data: n });
    }
    // Apply location updates
    for (const l of bk.locationUpdates ?? []) {
      await applyBookkeeperSuggestion({ type: "locationUpdate", data: l });
    }
    // Store canon facts
    for (const fact of bk.canonFacts ?? []) {
      await addCanonFact(campaignId, fact);
    }
    setBookkeepingApplied(true);
  };

  return (
    <Box
      sx={{
        p: 1.5,
        border: 1,
        borderColor: isPending ? "primary.light" : "divider",
        borderRadius: 1,
        bgcolor: isPending ? "action.hover" : undefined,
        opacity: proposal.status === "rejected" ? 0.5 : 1,
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <Chip
          label={MODE_LABELS[proposal.mode] ?? proposal.mode}
          size="small"
          variant="outlined"
        />
        {!isPending && (
          <Typography variant="caption" color="text.secondary">
            {proposal.status}
          </Typography>
        )}
      </Box>

      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 0.5 }}>
        {proposal.content}
      </Typography>

      {/* Structured data renderers */}
      {proposal.mode === "priceProposal" && structured && (
        <PriceProposalDetails data={structured as PriceProposalData} />
      )}
      {proposal.mode === "clockAdvance" && structured && (
        <ClockAdvanceDetails
          data={structured as ClockAdvanceData}
          campaignId={campaignId}
          onApplied={onAccept}
        />
      )}
      {proposal.mode === "bookkeepingProposal" && structured && isPending && (
        <BookkeepingDetails
          data={proposal.structuredData as BookkeeperOutput}
          onApply={handleApplyBookkeeping}
          applied={bookkeepingApplied}
        />
      )}

      {isPending && (
        <Box display="flex" gap={1} mt={1} flexWrap="wrap">
          <Button size="small" startIcon={<CheckIcon />} onClick={onAccept}>
            Accept
          </Button>
          {/* Offer bookkeeping follow-up after accepting narrative proposals */}
          {(proposal.mode === "priceProposal" ||
            proposal.mode === "outcomeNarration") && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<BuildIcon />}
              onClick={() => {
                onAccept();
                onTriggerBookkeeping();
              }}
            >
              Accept + Bookkeep
            </Button>
          )}
          <Button
            size="small"
            color="inherit"
            startIcon={<CloseIcon />}
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function AIGuidedPanel() {
  const { gameSystem } = useGameSystem();
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const campaignType = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.type
  );
  const guideState = useStore((store) => store.aiGuide.state);
  const isLoading = useStore((store) => store.aiGuide.isLoading);
  const loadGuideState = useStore((store) => store.aiGuide.loadGuideState);
  const isRequesting = useStore((store) => store.ai.isRequesting);
  const requestAi = useStore((store) => store.ai.requestAi);
  const addProposal = useStore((store) => store.aiGuide.addProposal);
  const updateProposalStatus = useStore((s) => s.aiGuide.updateProposalStatus);
  const saveGuideState = useStore((s) => s.aiGuide.saveGuideState);

  const [mode, setMode] = useState<AiGuidedMode>("sceneFrame");
  const [input, setInput] = useState("");

  useAIGuideQueue();

  useEffect(() => {
    if (campaignId) {
      loadGuideState(campaignId);
    }
  }, [campaignId, loadGuideState]);

  const handleGenerate = async () => {
    if (!campaignId) return;
    const storeState = useStore.getState();
    const context = buildContext(gameSystem, storeState, input.trim() || undefined);
    const worldId = storeState.worlds.currentWorld.currentWorldId;

    const response = await requestAi({ mode, campaignId, context, worldId });

    const structured = response.structured as Record<string, unknown> | undefined;
    const content =
      response.text ??
      (structured
        ? (structured.narrative as string | undefined) ??
          (structured.narrativeSignal as string | undefined) ??
          JSON.stringify(structured)
        : "");

    if (campaignId) {
      await addProposal(campaignId, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        mode,
        content,
        structuredData: response.structured ?? response.bookkeeper,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }
    setInput("");
  };

  const handleAccept = async (proposalId: string) => {
    if (!campaignId) return;
    await updateProposalStatus(campaignId, proposalId, "accepted");
  };

  const handleDismiss = async (proposalId: string) => {
    if (!campaignId) return;
    await updateProposalStatus(campaignId, proposalId, "rejected");
  };

  const handleTriggerBookkeeping = async (sourceProposal: AIGuideProposal) => {
    if (!campaignId) return;
    const storeState = useStore.getState();
    const context = buildContext(
      gameSystem,
      storeState,
      sourceProposal.content
    );
    const worldId = storeState.worlds.currentWorld.currentWorldId;
    const response = await requestAi({
      mode: "bookkeepingProposal",
      campaignId,
      context,
      worldId,
    });
    const currentState = storeState.aiGuide.state;
    if (!currentState) return;
    await saveGuideState(campaignId, {
      ...currentState,
      pendingProposals: [
        ...currentState.pendingProposals,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          mode: "bookkeepingProposal" as AiGuidedMode,
          content: response.text ?? "",
          structuredData: response.bookkeeper,
          status: "pending" as const,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  if (campaignType !== CampaignType.AIGuided) {
    return (
      <Box p={2}>
        <Alert severity="info">
          The AI Guide panel is only available in AI Guided campaigns.
        </Alert>
      </Box>
    );
  }

  if (!campaignId) {
    return (
      <Box p={2}>
        <Alert severity="info">Open a campaign to use the AI Guide.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box p={2} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  const visibleProposals = (guideState?.pendingProposals ?? []).filter(
    (p) => p.status !== "rejected"
  );

  return (
    <Stack sx={{ height: "100%", overflow: "hidden" }}>
      {/* Request bar */}
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Box display="flex" gap={0.75} flexWrap="wrap" mb={1}>
          {MANUAL_MODES.map((m) => (
            <Chip
              key={m}
              label={MODE_LABELS[m]}
              size="small"
              variant={mode === m ? "filled" : "outlined"}
              color={mode === m ? "primary" : "default"}
              onClick={() => setMode(m)}
            />
          ))}
        </Box>
        <TextField
          size="small"
          fullWidth
          placeholder={
            mode === "clockAdvance"
              ? "Describe what happened to advance the clock"
              : mode === "bookkeepingProposal"
              ? "Paste narrative text to extract game state updates"
              : "Additional context (optional)"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          multiline={mode === "bookkeepingProposal"}
          rows={mode === "bookkeepingProposal" ? 3 : 1}
          sx={{ mb: 1 }}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={handleGenerate}
          disabled={isRequesting || !campaignId}
          startIcon={
            isRequesting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <AutoFixHighIcon />
            )
          }
        >
          {isRequesting ? "Thinking…" : "Ask Guide"}
        </Button>
      </Box>

      {/* Tension clocks summary */}
      {guideState?.tensionClocks && guideState.tensionClocks.length > 0 && (
        <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            Tension clocks
          </Typography>
          <Stack spacing={0.5}>
            {guideState.tensionClocks.map((c) => (
              <Box key={c.id} display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" sx={{ flex: 1 }}>
                  {c.label}
                </Typography>
                <Typography variant="caption" color="warning.main">
                  {c.filled}/{c.segments}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Proposals */}
      <Box sx={{ flex: 1, overflow: "auto", p: 1.5 }}>
        {visibleProposals.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            mt={2}
          >
            The AI Guide responds automatically to move outcomes and oracle
            rolls. Use the buttons above to ask the Guide anything.
          </Typography>
        ) : (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Guide proposals
            </Typography>
            <Divider />
            {visibleProposals
              .slice()
              .reverse()
              .map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  campaignId={campaignId}
                  onAccept={() => handleAccept(proposal.id)}
                  onDismiss={() => handleDismiss(proposal.id)}
                  onTriggerBookkeeping={() => handleTriggerBookkeeping(proposal)}
                />
              ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
