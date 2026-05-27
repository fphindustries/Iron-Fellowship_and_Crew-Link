import { useEffect, useRef, useCallback } from "react";
import { useStore } from "stores/store";
import { CampaignType } from "types/Campaign.type";
import {
  SESSION_EVENT_TYPE,
  MoveSessionEvent,
  OracleSessionEvent,
} from "types/SessionLog.type";
import { ROLL_RESULT } from "types/DieRolls.type";
import { TrackStatus, TrackTypes, SceneChallenge } from "types/Track.type";
import { useGameSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { AiCampaignContext, AiGuidedMode } from "types/AI.type";
import { AIGuideProposal } from "types/AIGuideState.type";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildCampaignContext(
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
      const resultLabel =
        m.outcome === ROLL_RESULT.HIT
          ? "hit"
          : m.outcome === ROLL_RESULT.WEAK_HIT
          ? "weakHit"
          : "miss";
      return { label: m.moveName, result: resultLabel as "hit" | "weakHit" | "miss" };
    });

  return {
    gameSystem: gameSystem === GAME_SYSTEMS.STARFORGED ? "starforged" : "ironsworn",
    campaignName: campaign?.name ?? "Unknown Campaign",
    campaignType: (campaign?.type ?? CampaignType.AIGuided) as "ai-guided",
    activeVows,
    activeJourneys,
    characters,
    recentRolls,
    freeformInput,
  };
}

function getFirstActiveSceneChallenge(
  store: ReturnType<typeof useStore.getState>
): SceneChallenge | null {
  const trackMap =
    store.campaigns.currentCampaign.tracks.trackMap[TrackStatus.Active];
  const challenges = Object.values(trackMap?.[TrackTypes.SceneChallenge] ?? {});
  return challenges[0] ?? null;
}

export function useAIGuideQueue() {
  const { gameSystem } = useGameSystem();
  const campaignType = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaign?.type
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );
  const events = useStore((store) => store.sessionLog.events);
  const requestAi = useStore((store) => store.ai.requestAi);
  const addProposal = useStore((store) => store.aiGuide.addProposal);
  const processedEventIds = useRef(new Set<string>());
  const lastLocationId = useRef<string | undefined>(undefined);

  const isAIGuided = campaignType === CampaignType.AIGuided;

  // Shared helper: create placeholder → call AI → update or remove placeholder
  const triggerAutoMode = useCallback(
    async (
      mode: AiGuidedMode,
      freeformInput: string,
      extraData?: object
    ) => {
      if (!campaignId) return;
      const store = useStore.getState();
      const context = buildCampaignContext(gameSystem, store, freeformInput);

      const placeholder: AIGuideProposal = {
        id: generateId(),
        mode,
        content: "",
        status: "pending",
        createdAt: new Date().toISOString(),
        structuredData: extraData,
      };

      await addProposal(campaignId, placeholder);

      try {
        const response = await requestAi({ mode, campaignId, context });
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
        if (!currentState || !campaignId) return;
        await useStore.getState().aiGuide.saveGuideState(campaignId, {
          ...currentState,
          pendingProposals: currentState.pendingProposals.map((p) =>
            p.id === placeholder.id ? updatedProposal : p
          ),
        });
      } catch {
        const currentState = useStore.getState().aiGuide.state;
        if (!currentState || !campaignId) return;
        await useStore.getState().aiGuide.saveGuideState(campaignId, {
          ...currentState,
          pendingProposals: currentState.pendingProposals.filter(
            (p) => p.id !== placeholder.id
          ),
        });
      }
    },
    [campaignId, gameSystem, requestAi, addProposal]
  );

  // Detect new session log events and trigger appropriate AI Guide modes
  useEffect(() => {
    if (!isAIGuided || !campaignId) return;

    const newEvents = Object.entries(events).filter(
      ([id]) => !processedEventIds.current.has(id)
    );

    for (const [id, event] of newEvents) {
      processedEventIds.current.add(id);

      if (event.type === SESSION_EVENT_TYPE.MOVE) {
        const move = event as MoveSessionEvent;
        const moveInput = `${move.moveName}${move.playerContext ? ` — "${move.playerContext}"` : ""}`;

        if (move.outcome === ROLL_RESULT.MISS) {
          triggerAutoMode("priceProposal", moveInput, { sourceEventId: id });
        }

        // If there's an active scene challenge, guide the challenge on any move
        const store = useStore.getState();
        const activeChallenge = getFirstActiveSceneChallenge(store);
        if (activeChallenge) {
          const resultLabel =
            move.outcome === ROLL_RESULT.HIT
              ? "strong hit"
              : move.outcome === ROLL_RESULT.WEAK_HIT
              ? "weak hit"
              : "miss";
          triggerAutoMode(
            "sceneChallengeGuidance",
            `${moveInput} — ${resultLabel}`,
            {
              sourceEventId: id,
              challengeLabel: activeChallenge.label,
              challengeProgress: activeChallenge.value,
            }
          );
        }
      } else if (event.type === SESSION_EVENT_TYPE.ORACLE) {
        const oracle = event as OracleSessionEvent;
        triggerAutoMode(
          "oracleInterpretation",
          `Oracle: ${oracle.oracleName} → "${oracle.result}"`,
          { sourceEventId: id, oracleName: oracle.oracleName, oracleResult: oracle.result }
        );
      }
    }
  }, [events, isAIGuided, campaignId, triggerAutoMode]);

  // Trigger sceneFrame when the current location changes
  useEffect(() => {
    if (!isAIGuided || !campaignId) return;

    const store = useStore.getState();
    const currentLocationId =
      store.worlds.currentWorld.currentWorldId ?? undefined;

    if (currentLocationId !== lastLocationId.current) {
      if (lastLocationId.current !== undefined) {
        // Location changed mid-session — frame the new scene
        triggerAutoMode("sceneFrame", "Scene transition: new location entered.");
      }
      lastLocationId.current = currentLocationId;
    }
  });

  // Reset processed IDs when campaign changes
  useEffect(() => {
    processedEventIds.current = new Set();
    lastLocationId.current = undefined;
  }, [campaignId]);
}
