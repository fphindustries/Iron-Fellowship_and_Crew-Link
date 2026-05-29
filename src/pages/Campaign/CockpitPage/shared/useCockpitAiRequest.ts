import { useCallback, useRef } from "react";
import { useStore } from "stores/store";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { AiCampaignContext, AiGuidedMode } from "types/AI.type";
import { AIGuideProposal } from "types/AIGuideState.type";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { SESSION_EVENT_TYPE, MoveSessionEvent } from "types/SessionLog.type";
import { ROLL_RESULT } from "types/DieRolls.type";
import { CampaignType } from "types/Campaign.type";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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

  const recentRolls = Object.values(store.sessionLog.events)
    .filter((e) => e.type === SESSION_EVENT_TYPE.MOVE)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10)
    .map((e) => {
      const m = e as MoveSessionEvent;
      const result =
        m.outcome === ROLL_RESULT.HIT
          ? "hit"
          : m.outcome === ROLL_RESULT.WEAK_HIT
          ? "weakHit"
          : "miss";
      return { label: m.moveName, result: result as "hit" | "weakHit" | "miss" };
    });

  const guideState = store.aiGuide.state;

  return {
    gameSystem: gameSystem === GAME_SYSTEMS.STARFORGED ? "starforged" : "ironsworn",
    campaignName: campaign?.name ?? "Unknown Campaign",
    campaignType: (campaign?.type ?? CampaignType.AIGuided) as "ai-guided",
    activeVows,
    activeJourneys,
    characters,
    recentRolls,
    freeformInput,
    guideState: guideState
      ? {
          currentScene: guideState.currentScene,
          canonFacts: [
            ...guideState.canonFacts,
            ...guideState.canonLedger
              .filter((f) => f.status === "confirmed")
              .map((f) => f.text),
          ],
          npcIntents: Object.fromEntries(
            Object.entries(guideState.npcIntents).map(([name, intent]) => [
              name,
              {
                currentIntent: intent.currentIntent,
                hiddenAspects: intent.hiddenAspects,
                firstImpressionRevealed: intent.firstImpressionRevealed,
              },
            ])
          ),
          tensionClocks: guideState.tensionClocks.map((c) => ({
            label: c.label,
            segments: c.segments,
            filled: c.filled,
            consequence: c.consequence,
          })),
          sceneChallengeState: guideState.sceneChallengeState,
          spotlight: guideState.spotlight,
        }
      : undefined,
  };
}

// Modes whose results are consumed inline — no user review needed in the drawer.
const EPHEMERAL_MODES = new Set<AiGuidedMode>([
  "actionSuggestions",
  "intentToMove",
  "spotlightNudge",
]);

export function useCockpitAiRequest() {
  const { gameSystem } = useGameSystem();
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const requestAi = useStore((store) => store.ai.requestAi);
  const addProposal = useStore((store) => store.aiGuide.addProposal);
  const pendingRef = useRef(new Set<string>());

  const request = useCallback(
    async (mode: AiGuidedMode, freeformInput?: string, extraData?: object) => {
      if (!campaignId) return;
      const store = useStore.getState();
      const context = buildContext(gameSystem, store, freeformInput);
      const worldId = store.campaigns.currentCampaign.currentCampaign?.worldId;

      const placeholder: AIGuideProposal = {
        id: generateId(),
        mode,
        content: "",
        status: "pending",
        createdAt: new Date().toISOString(),
        structuredData: extraData,
      };

      pendingRef.current.add(placeholder.id);
      await addProposal(campaignId, placeholder);

      try {
        const response = await requestAi({ mode, campaignId, context, worldId });
        const structured = response.structured as Record<string, unknown> | undefined;
        const content =
          response.text ??
          (structured
            ? (structured.narrative as string | undefined) ??
              (structured.narrativeSignal as string | undefined) ??
              JSON.stringify(structured)
            : "");

        const updatedProposal: AIGuideProposal = {
          ...placeholder,
          content,
          structuredData: {
            ...(extraData ?? {}),
            ...(response.structured as object ?? {}),
          },
        };

        const currentState = useStore.getState().aiGuide.state;
        if (!currentState) return updatedProposal;
        const isEphemeral = EPHEMERAL_MODES.has(mode);
        await useStore.getState().aiGuide.saveGuideState(campaignId, {
          ...currentState,
          pendingProposals: isEphemeral
            ? currentState.pendingProposals.filter((p) => p.id !== placeholder.id)
            : currentState.pendingProposals.map((p) =>
                p.id === placeholder.id ? updatedProposal : p
              ),
        });
        return updatedProposal;
      } catch {
        const currentState = useStore.getState().aiGuide.state;
        if (!currentState) return;
        await useStore.getState().aiGuide.saveGuideState(campaignId, {
          ...currentState,
          pendingProposals: currentState.pendingProposals.filter(
            (p) => p.id !== placeholder.id
          ),
        });
      } finally {
        pendingRef.current.delete(placeholder.id);
      }
    },
    [campaignId, gameSystem, requestAi, addProposal]
  );

  return { request, campaignId };
}
