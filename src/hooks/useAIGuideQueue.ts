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
import { AiGuidedMode } from "types/AI.type";
import { AIGuideProposal } from "types/AIGuideState.type";
import { buildBaseCampaignContext } from "hooks/buildAiCampaignContext";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
  const currentWorldId = useStore(
    (store) => store.worlds.currentWorld.currentWorldId
  );
  const events = useStore((store) => store.sessionLog.events);
  const requestAi = useStore((store) => store.ai.requestAi);
  const addProposal = useStore((store) => store.aiGuide.addProposal);
  const processedEventIds = useRef(new Set<string>());
  const lastLocationId = useRef<string | undefined>(undefined);
  const pendingOracleRef = useRef(false);

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
      const context = buildBaseCampaignContext(gameSystem, store, freeformInput);

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

  // Detect new session log events and trigger appropriate AI Guide modes.
  // Awaited sequentially to prevent concurrent saveGuideState race conditions.
  useEffect(() => {
    if (!isAIGuided || !campaignId) return;

    const newEvents = Object.entries(events).filter(
      ([id]) => !processedEventIds.current.has(id)
    );
    if (newEvents.length === 0) return;

    (async () => {
      for (const [id, event] of newEvents) {
        processedEventIds.current.add(id);

        if (event.type === SESSION_EVENT_TYPE.MOVE) {
          const move = event as MoveSessionEvent;
          const moveInput = `${move.moveName}${move.playerContext ? ` — "${move.playerContext}"` : ""}`;

          if (move.outcome === ROLL_RESULT.MISS) {
            await triggerAutoMode("priceProposal", moveInput, { sourceEventId: id });
          }

          const store = useStore.getState();
          const activeChallenge = getFirstActiveSceneChallenge(store);
          if (activeChallenge) {
            const resultLabel =
              move.outcome === ROLL_RESULT.HIT
                ? "strong hit"
                : move.outcome === ROLL_RESULT.WEAK_HIT
                ? "weak hit"
                : "miss";
            await triggerAutoMode(
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
          // Guard against concurrent oracle calls when multiple oracles fire rapidly
          if (!pendingOracleRef.current) {
            const oracle = event as OracleSessionEvent;
            pendingOracleRef.current = true;
            try {
              await triggerAutoMode(
                "oracleInterpretation",
                `Oracle: ${oracle.oracleName} → "${oracle.result}"`,
                { sourceEventId: id, oracleName: oracle.oracleName, oracleResult: oracle.result }
              );
            } finally {
              pendingOracleRef.current = false;
            }
          }
        }
      }
    })();
  }, [events, isAIGuided, campaignId, triggerAutoMode]);

  // Trigger sceneFrame when the current location changes
  useEffect(() => {
    if (!isAIGuided || !campaignId) return;

    if (currentWorldId !== lastLocationId.current) {
      if (lastLocationId.current !== undefined) {
        triggerAutoMode("sceneFrame", "Scene transition: new location entered.");
      }
      lastLocationId.current = currentWorldId ?? undefined;
    }
  }, [currentWorldId, isAIGuided, campaignId, triggerAutoMode]);

  // Reset processed IDs when campaign changes
  useEffect(() => {
    processedEventIds.current = new Set();
    lastLocationId.current = undefined;
  }, [campaignId]);
}
