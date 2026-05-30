import { describe, expect, it, vi, beforeEach } from "vitest";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createSessionLogSlice } from "./sessionLog.slice";
import type { SessionLogSlice } from "./sessionLog.slice.type";
import { api } from "config/api.config";
import { ROLL_RESULT } from "types/DieRolls.type";
import { SESSION_EVENT_TYPE } from "types/SessionLog.type";

vi.mock("config/api.config", () => ({
  api: {
    post: vi.fn().mockResolvedValue({ id: "event-1" }),
  },
}));

const mockPost = api.post as ReturnType<typeof vi.fn>;

interface TestStore {
  sessionLog: SessionLogSlice;
  auth: { uid?: string };
  campaigns: {
    currentCampaign: {
      currentCampaignId?: string;
    };
  };
  characters: {
    currentCharacter: {
      currentCharacterId?: string | null;
      currentCharacter?: { name: string };
    };
  };
}

function createTestStore() {
  return create<TestStore>()(
    immer((set, get) => ({
      sessionLog: createSessionLogSlice(set as never, get as never, {} as never),
      auth: { uid: "user-1" },
      campaigns: {
        currentCampaign: {
          currentCampaignId: "campaign-1",
        },
      },
      characters: {
        currentCharacter: {
          currentCharacterId: "current-character",
          currentCharacter: { name: "Current Character" },
        },
      },
    }))
  );
}

describe("Session log slice", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ id: "event-1" });
    store = createTestStore();
  });

  describe("logMoveEventForCharacter", () => {
    it("logs a move event for the supplied character instead of the current character", async () => {
      store.setState((state) => {
        state.sessionLog.activeSessionId = "session-1";
      });

      const eventId = await store
        .getState()
        .sessionLog.logMoveEventForCharacter("swearer-1", "Sable", {
          moveId: "starforged/moves/quest/swear_an_iron_vow",
          moveName: "Swear an Iron Vow",
          stat: "Heart",
          statValue: 2,
          action: 5,
          challengeDice: [3, 8],
          score: 8,
          outcome: ROLL_RESULT.WEAK_HIT,
        });

      expect(eventId).toBe("event-1");
      expect(mockPost).toHaveBeenCalledWith("/api/sessions/session-1/events", {
        characterId: "swearer-1",
        characterName: "Sable",
        type: SESSION_EVENT_TYPE.MOVE,
        dataJson: expect.objectContaining({
          characterId: "swearer-1",
          characterName: "Sable",
          moveName: "Swear an Iron Vow",
          type: SESSION_EVENT_TYPE.MOVE,
        }),
      });
      expect(store.getState().sessionLog.events["event-1"]).toEqual(
        expect.objectContaining({
          characterId: "swearer-1",
          characterName: "Sable",
          moveName: "Swear an Iron Vow",
        })
      );
    });

    it("does not post when there is no active session", async () => {
      const eventId = await store
        .getState()
        .sessionLog.logMoveEventForCharacter("swearer-1", "Sable", {
          moveId: "starforged/moves/quest/swear_an_iron_vow",
          moveName: "Swear an Iron Vow",
        });

      expect(eventId).toBe("");
      expect(mockPost).not.toHaveBeenCalled();
    });
  });
});
