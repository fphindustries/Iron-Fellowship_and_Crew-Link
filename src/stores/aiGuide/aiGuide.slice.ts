import { CreateSliceType } from "stores/store.type";
import { AIGuideSlice } from "./aiGuide.slice.type";
import { defaultAIGuideSlice } from "./aiGuide.slice.default";
import { defaultAIGuideState, AIGuideState, CanonFact } from "types/AIGuideState.type";
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
    const previousState = getState().aiGuide.state;
    set((store) => {
      store.aiGuide.isSaving = true;
      store.aiGuide.state = state;
    });
    try {
      await updateAIGuideState(campaignId, state);
    } catch (e) {
      set((store) => {
        store.aiGuide.state = previousState;
      });
      throw e;
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
    await getState().aiGuide.addCanonToLedger(campaignId, {
      text: fact,
      source: "ai",
      status: "proposed",
    });
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
    const matchClock = (c: { id: string; label: string }) =>
      (clockId && c.id === clockId) || (clockLabel && c.label === clockLabel);

    const existingIndex = current.tensionClocks.findIndex(matchClock);
    if (existingIndex < 0) return; // no matching clock — skip, don't auto-create

    const tensionClocks = current.tensionClocks.map((c, i) =>
      i === existingIndex
        ? { ...c, filled: Math.min(c.filled + advanceBy, c.segments) }
        : c
    );

    const updated: AIGuideState = { ...current, tensionClocks };
    await getState().aiGuide.saveGuideState(campaignId, updated);
  },

  setFocusMode: async (campaignId, mode) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    await getState().aiGuide.saveGuideState(campaignId, { ...current, focusMode: mode });
  },

  setSpotlight: async (campaignId, spotlight) => {
    const current = getState().aiGuide.state ?? defaultAIGuideState;
    await getState().aiGuide.saveGuideState(campaignId, { ...current, spotlight });
  },

  resetStore: () => {
    set((store) => {
      store.aiGuide = { ...store.aiGuide, ...defaultAIGuideSlice };
    });
  },
});
