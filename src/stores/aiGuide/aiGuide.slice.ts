import { CreateSliceType } from "stores/store.type";
import { AIGuideSlice } from "./aiGuide.slice.type";
import { defaultAIGuideSlice } from "./aiGuide.slice.default";
import { defaultAIGuideState, AIGuideState, CanonFact, FocusMode, SpotlightState } from "types/AIGuideState.type";
import { getAIGuideState } from "api/ai/getAIGuideState";
import { updateAIGuideState } from "api/ai/updateAIGuideState";

export const createAIGuideSlice: CreateSliceType<AIGuideSlice> = (set, getState) => ({
  ...defaultAIGuideSlice,

  loadGuideState: async (campaignId) => {
    set((store) => {
      store.aiGuide.isLoading = true;
    });
    try {
      const result = await getAIGuideState(campaignId);
      set((store) => {
        store.aiGuide.state = result?.stateJson ?? defaultAIGuideState;
        store.aiGuide.isLoading = false;
      });
    } catch {
      set((store) => {
        store.aiGuide.state = defaultAIGuideState;
        store.aiGuide.isLoading = false;
      });
    }
  },

  saveGuideState: async (campaignId, state) => {
    set((store) => {
      store.aiGuide.isSaving = true;
      store.aiGuide.state = state;
    });
    try {
      await updateAIGuideState(campaignId, state);
    } finally {
      set((store) => {
        store.aiGuide.isSaving = false;
      });
    }
  },

  updateScene: async (campaignId, scenePatch) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    const updated: AIGuideState = {
      ...current,
      currentScene: { ...current.currentScene, ...scenePatch },
    };
    await getState().aiGuide.saveGuideState(campaignId, updated);
  },

  addCanonFact: async (campaignId, fact) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    if (current.canonFacts.includes(fact)) return;
    const updated: AIGuideState = {
      ...current,
      canonFacts: [...current.canonFacts, fact],
    };
    await getState().aiGuide.saveGuideState(campaignId, updated);
  },

  addCanonToLedger: async (campaignId, entry) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    const fact: CanonFact = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const canonLedger = [...(current.canonLedger ?? []), fact];
    await getState().aiGuide.saveGuideState(campaignId, { ...current, canonLedger });
    return fact;
  },

  updateCanonFact: async (campaignId, factId, patch) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    const canonLedger = (current.canonLedger ?? []).map((f) =>
      f.id === factId ? { ...f, ...patch } : f
    );
    await getState().aiGuide.saveGuideState(campaignId, { ...current, canonLedger });
  },

  removeCanonFact: async (campaignId, factId) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    const canonLedger = (current.canonLedger ?? []).filter((f) => f.id !== factId);
    await getState().aiGuide.saveGuideState(campaignId, { ...current, canonLedger });
  },

  addProposal: async (campaignId, proposal) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    const updated: AIGuideState = {
      ...current,
      pendingProposals: [...current.pendingProposals, proposal],
    };
    await getState().aiGuide.saveGuideState(campaignId, updated);
  },

  updateProposalStatus: async (campaignId, proposalId, status) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    const updated: AIGuideState = {
      ...current,
      pendingProposals: current.pendingProposals.map((p) =>
        p.id === proposalId ? { ...p, status } : p
      ),
    };
    await getState().aiGuide.saveGuideState(campaignId, updated);
  },

  upsertTensionClock: async (campaignId, clock) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    const existing = current.tensionClocks.findIndex((c) => c.id === clock.id);
    const tensionClocks =
      existing >= 0
        ? current.tensionClocks.map((c) => (c.id === clock.id ? clock : c))
        : [...current.tensionClocks, clock];
    const updated: AIGuideState = { ...current, tensionClocks };
    await getState().aiGuide.saveGuideState(campaignId, updated);
  },

  applyClockAdvance: async (campaignId, clockId, clockLabel, advanceBy) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    // Try to find the clock by id first, then by label
    const matchClock = (c: { id: string; label: string }) =>
      (clockId && c.id === clockId) || (clockLabel && c.label === clockLabel);

    const existingIndex = current.tensionClocks.findIndex(matchClock);
    let tensionClocks = [...current.tensionClocks];

    if (existingIndex >= 0) {
      const existing = tensionClocks[existingIndex];
      tensionClocks[existingIndex] = {
        ...existing,
        filled: Math.min(existing.filled + advanceBy, existing.segments),
      };
    } else if (clockLabel) {
      // New tension clock the AI referenced — create it with default shape
      tensionClocks = [
        ...tensionClocks,
        {
          id: clockId ?? `${Date.now()}`,
          label: clockLabel,
          segments: 6,
          filled: Math.max(0, advanceBy),
          hiddenFromPlayers: true,
          consequence: "",
        },
      ];
    }

    const updated: AIGuideState = { ...current, tensionClocks };
    await getState().aiGuide.saveGuideState(campaignId, updated);
  },

  setFocusMode: async (campaignId, mode) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    await getState().aiGuide.saveGuideState(campaignId, { ...current, focusMode: mode as FocusMode });
  },

  setSpotlight: async (campaignId, spotlight) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    await getState().aiGuide.saveGuideState(campaignId, { ...current, spotlight: spotlight as SpotlightState });
  },

  resetStore: () => {
    set((store) => {
      store.aiGuide = { ...store.aiGuide, ...defaultAIGuideSlice };
    });
  },
});
