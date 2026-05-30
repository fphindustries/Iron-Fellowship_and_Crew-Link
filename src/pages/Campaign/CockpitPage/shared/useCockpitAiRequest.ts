import { useCallback } from "react";
import { useStore } from "stores/store";
import { useGameSystem } from "hooks/useGameSystem";
import { AiGuidedMode } from "types/AI.type";
import { AIGuideProposal } from "types/AIGuideState.type";
import { buildBaseCampaignContext, buildGuideStateContext } from "hooks/buildAiCampaignContext";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Modes whose results are consumed inline — no user review needed, skip DB lifecycle.
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

  const request = useCallback(
    async (mode: AiGuidedMode, freeformInput?: string, extraData?: object) => {
      if (!campaignId) return;
      const store = useStore.getState();
      const context = {
        ...buildBaseCampaignContext(gameSystem, store, freeformInput),
        guideState: buildGuideStateContext(store),
      };
      const worldId = store.campaigns.currentCampaign.currentCampaign?.worldId;

      // Ephemeral modes skip the proposal DB lifecycle entirely
      if (EPHEMERAL_MODES.has(mode)) {
        const response = await requestAi({ mode, campaignId, context, worldId });
        const structured = response.structured as Record<string, unknown> | undefined;
        const content =
          response.text ??
          (structured
            ? (structured.narrative as string | undefined) ??
              (structured.narrativeSignal as string | undefined) ??
              JSON.stringify(structured)
            : "");
        return {
          id: generateId(),
          mode,
          content,
          status: "pending" as const,
          createdAt: new Date().toISOString(),
          structuredData: {
            ...(extraData ?? {}),
            ...(response.structured as object ?? {}),
          },
        } satisfies AIGuideProposal;
      }

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
        await useStore.getState().aiGuide.saveGuideState(campaignId, {
          ...currentState,
          pendingProposals: currentState.pendingProposals.map((p) =>
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
      }
    },
    [campaignId, gameSystem, requestAi, addProposal]
  );

  return { request, campaignId };
}
