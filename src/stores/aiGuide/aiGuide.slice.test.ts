import { describe, it, expect, vi, beforeEach } from "vitest";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createAIGuideSlice } from "./aiGuide.slice";
import { defaultAIGuideState } from "types/AIGuideState.type";
import type { AIGuideSlice } from "./aiGuide.slice.type";

// Mock API calls — the slice should not make real HTTP requests in tests
vi.mock("api/ai/getAIGuideState", () => ({
  getAIGuideState: vi.fn().mockResolvedValue(null),
}));
vi.mock("api/ai/updateAIGuideState", () => ({
  updateAIGuideState: vi.fn().mockResolvedValue(undefined),
}));

import { updateAIGuideState } from "api/ai/updateAIGuideState";
const mockUpdateAIGuideState = updateAIGuideState as ReturnType<typeof vi.fn>;

function createTestStore() {
  return create<{ aiGuide: AIGuideSlice }>()(
    immer((set, get) => ({
      aiGuide: createAIGuideSlice(set as any, get as any, {} as any),
    }))
  );
}

describe("AIGuide slice", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createTestStore();
    // Seed default state so actions have something to work with
    store.setState((s) => {
      s.aiGuide.state = { ...defaultAIGuideState };
    });
  });

  describe("addCanonToLedger", () => {
    it("appends a new fact to canonLedger with an id and timestamp", async () => {
      await store
        .getState()
        .aiGuide.addCanonToLedger("campaign-1", {
          text: "The station is abandoned.",
          source: "player",
          status: "confirmed",
        });

      const { canonLedger } = store.getState().aiGuide.state!;
      expect(canonLedger).toHaveLength(1);
      expect(canonLedger[0].text).toBe("The station is abandoned.");
      expect(canonLedger[0].id).toBeTruthy();
    });

    it("calls saveGuideState (which hits the API)", async () => {
      await store
        .getState()
        .aiGuide.addCanonToLedger("campaign-1", {
          text: "Fact",
          source: "ai",
          status: "proposed",
        });

      expect(mockUpdateAIGuideState).toHaveBeenCalledOnce();
    });
  });

  describe("removeCanonFact", () => {
    it("removes a fact by id", async () => {
      // Seed a fact directly
      store.setState((s) => {
        s.aiGuide.state!.canonLedger = [
          {
            id: "fact-1",
            text: "Known fact",
            source: "player",
            status: "confirmed",
            createdAt: new Date().toISOString(),
          },
        ];
      });

      await store.getState().aiGuide.removeCanonFact("campaign-1", "fact-1");
      expect(store.getState().aiGuide.state!.canonLedger).toHaveLength(0);
    });

    it("does not affect unrelated facts", async () => {
      store.setState((s) => {
        s.aiGuide.state!.canonLedger = [
          {
            id: "fact-1",
            text: "Keep me",
            source: "player",
            status: "confirmed",
            createdAt: new Date().toISOString(),
          },
          {
            id: "fact-2",
            text: "Remove me",
            source: "ai",
            status: "proposed",
            createdAt: new Date().toISOString(),
          },
        ];
      });

      await store.getState().aiGuide.removeCanonFact("campaign-1", "fact-2");
      const remaining = store.getState().aiGuide.state!.canonLedger;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("fact-1");
    });
  });

  describe("applyClockAdvance", () => {
    beforeEach(() => {
      store.setState((s) => {
        s.aiGuide.state!.tensionClocks = [
          {
            id: "clock-1",
            label: "Enemy Reinforcements",
            segments: 6,
            filled: 2,
            hiddenFromPlayers: false,
            consequence: "Overrun",
          },
        ];
      });
    });

    it("advances the clock by the given amount", async () => {
      await store
        .getState()
        .aiGuide.applyClockAdvance("campaign-1", "clock-1", null, 2);

      const clock = store.getState().aiGuide.state!.tensionClocks[0];
      expect(clock.filled).toBe(4);
    });

    it("caps at the segment count (does not overflow)", async () => {
      await store
        .getState()
        .aiGuide.applyClockAdvance("campaign-1", "clock-1", null, 10);

      const clock = store.getState().aiGuide.state!.tensionClocks[0];
      expect(clock.filled).toBe(6); // capped at segments
    });

    it("does nothing when clock is not found", async () => {
      await store
        .getState()
        .aiGuide.applyClockAdvance("campaign-1", "nonexistent", null, 1);

      const clock = store.getState().aiGuide.state!.tensionClocks[0];
      expect(clock.filled).toBe(2); // unchanged
      expect(mockUpdateAIGuideState).not.toHaveBeenCalled();
    });

    it("can find clock by label instead of id", async () => {
      await store
        .getState()
        .aiGuide.applyClockAdvance(
          "campaign-1",
          null,
          "Enemy Reinforcements",
          1
        );

      const clock = store.getState().aiGuide.state!.tensionClocks[0];
      expect(clock.filled).toBe(3);
    });
  });

  describe("updateProposalStatus", () => {
    it("updates the status of a specific proposal", async () => {
      store.setState((s) => {
        s.aiGuide.state!.pendingProposals = [
          {
            id: "p1",
            mode: "askOrAnswer",
            content: "Something happened",
            status: "pending",
            createdAt: new Date().toISOString(),
          },
        ];
      });

      await store
        .getState()
        .aiGuide.updateProposalStatus("campaign-1", "p1", "accepted");

      const proposal = store.getState().aiGuide.state!.pendingProposals[0];
      expect(proposal.status).toBe("accepted");
    });
  });

  describe("saveGuideState", () => {
    it("rolls back state when the API call fails", async () => {
      const originalScene = { ...defaultAIGuideState.currentScene };
      mockUpdateAIGuideState.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        store.getState().aiGuide.saveGuideState("campaign-1", {
          ...defaultAIGuideState,
          currentScene: {
            title: "New Scene",
            description: "",
            unresolvedQuestions: [],
          },
        })
      ).rejects.toThrow("Network error");

      // State rolled back to original
      expect(store.getState().aiGuide.state!.currentScene.title).toBe(
        originalScene.title
      );
    });

    it("clears isSaving flag after failure", async () => {
      mockUpdateAIGuideState.mockRejectedValueOnce(new Error("fail"));
      await expect(
        store
          .getState()
          .aiGuide.saveGuideState("campaign-1", defaultAIGuideState)
      ).rejects.toThrow();
      expect(store.getState().aiGuide.isSaving).toBe(false);
    });
  });
});
