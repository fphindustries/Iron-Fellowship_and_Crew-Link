import { CreateSliceType } from "stores/store.type";
import { SessionLogSlice } from "./sessionLog.slice.type";
import { defaultSessionLogSlice } from "./sessionLog.slice.default";
import { api } from "config/api.config";
import {
  OracleSessionEvent,
  SESSION_EVENT_TYPE,
  SessionLogEvent,
  CombatStartSessionEvent,
  CombatEndSessionEvent,
  SessionDocument,
} from "types/SessionLog.type";

type SessionRow = Omit<SessionDocument, "startedAt" | "endedAt"> & {
  id: string;
  startedAt: string | Date;
  endedAt?: string | Date;
};

function buildBaseEvent(state: ReturnType<typeof import("stores/store").useStore.getState>) {
  const sessionId = state.sessionLog.activeSessionId;
  const campaignId = state.campaigns.currentCampaign.currentCampaignId;
  const characterId = state.characters.currentCharacter.currentCharacterId ?? null;
  const characterName = state.characters.currentCharacter.currentCharacter?.name ?? "";
  const uid = state.auth.uid ?? "";
  return { sessionId, campaignId, characterId, characterName, uid };
}

async function postEvent(sessionId: string, event: SessionLogEvent): Promise<string> {
  const row = await api.post<{ id: string }>(`/api/sessions/${sessionId}/events`, {
    characterId: event.characterId,
    characterName: event.characterName,
    type: event.type,
    dataJson: event,
  });
  return row.id;
}

export const createSessionLogSlice: CreateSliceType<SessionLogSlice> = (
  set,
  getState
) => ({
  ...defaultSessionLogSlice,

  startSession: async (params) => {
    const state = getState();
    if (state.sessionLog.activeSessionId) {
      return Promise.reject("A session is already active.");
    }
    const row = await api.post<{ id: string }>("/api/sessions", params);
    set((store) => {
      store.sessionLog.activeSessionId = row.id;
      store.sessionLog.activeSession = {
        startedAt: new Date(),
        isActive: true,
        characterId: params.characterId,
        campaignId: params.campaignId,
        title: params.title,
      };
      store.sessionLog.events = {};
    });
    return row.id;
  },

  endSession: async (summary) => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    if (!sessionId) return Promise.reject("No active session to end.");
    await api.patch(`/api/sessions/${sessionId}`, { isActive: false, summary });
    set((store) => {
      store.sessionLog.activeSessionId = undefined;
      store.sessionLog.activeSession = undefined;
    });
  },

  logMoveEvent: (eventData) => {
    const state = getState();
    const { sessionId, characterId, characterName, uid } = buildBaseEvent(state);
    if (!sessionId) return Promise.resolve("");
    const event: SessionLogEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.MOVE,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };
    return postEvent(sessionId, event).then((id) => {
      set((store) => { store.sessionLog.events[id] = { ...event, sessionId: id }; });
      return id;
    }).catch(() => "");
  },

  logMoveEventForCharacter: (characterId, characterName, eventData) => {
    const state = getState();
    const { sessionId, uid } = buildBaseEvent(state);
    if (!sessionId) return Promise.resolve("");
    const event: SessionLogEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.MOVE,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };
    return postEvent(sessionId, event).then((id) => {
      set((store) => { store.sessionLog.events[id] = { ...event, sessionId: id }; });
      return id;
    }).catch(() => "");
  },

  logStatChangeEvent: (eventData) => {
    const state = getState();
    const { sessionId, characterId, characterName, uid } = buildBaseEvent(state);
    if (!sessionId) return;
    const event: SessionLogEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.STAT_CHANGE,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };
    postEvent(sessionId, event).then((id) => {
      set((store) => { store.sessionLog.events[id] = { ...event, sessionId: id }; });
    }).catch(() => {});
  },

  logProgressEvent: (eventData) => {
    const state = getState();
    const { sessionId, characterId, characterName, uid } = buildBaseEvent(state);
    if (!sessionId) return;
    const event: SessionLogEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.PROGRESS,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };
    postEvent(sessionId, event).then((id) => {
      set((store) => { store.sessionLog.events[id] = { ...event, sessionId: id }; });
    }).catch(() => {});
  },

  logJournalEvent: (text, isAiGenerated = false) => {
    const state = getState();
    const { sessionId, characterId, characterName, uid } = buildBaseEvent(state);
    if (!sessionId) return;
    const event: SessionLogEvent = {
      type: SESSION_EVENT_TYPE.JOURNAL,
      text,
      isAiGenerated,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };
    postEvent(sessionId, event).then((id) => {
      set((store) => { store.sessionLog.events[id] = { ...event, sessionId: id }; });
    }).catch(() => {});
  },

  logOracleEvent: (eventData) => {
    const state = getState();
    const { sessionId, characterId, characterName, uid } = buildBaseEvent(state);
    if (!sessionId) return;
    const event: OracleSessionEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.ORACLE,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };
    postEvent(sessionId, event).then((id) => {
      set((store) => { store.sessionLog.events[id] = { ...event, sessionId: id }; });
    }).catch(() => {});
  },

  logCombatStartEvent: (eventData) => {
    const state = getState();
    const { sessionId, characterId, characterName, uid } = buildBaseEvent(state);
    if (!sessionId) return;
    const event: CombatStartSessionEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.COMBAT_START,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };
    postEvent(sessionId, event).then((id) => {
      set((store) => { store.sessionLog.events[id] = { ...event, sessionId: id }; });
    }).catch(() => {});
  },

  logCombatEndEvent: (eventData) => {
    const state = getState();
    const { sessionId, characterId, characterName, uid } = buildBaseEvent(state);
    if (!sessionId) return;
    const event: CombatEndSessionEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.COMBAT_END,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };
    postEvent(sessionId, event).then((id) => {
      set((store) => { store.sessionLog.events[id] = { ...event, sessionId: id }; });
    }).catch(() => {});
  },

  updateMoveEventNarrative: (eventId, narrative) => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    if (!sessionId) return;
    set((store) => {
      const event = store.sessionLog.events[eventId];
      if (event && event.type === SESSION_EVENT_TYPE.MOVE) {
        (event as import("types/SessionLog.type").MoveSessionEvent).narrative = narrative;
      }
    });
    api
      .patch(`/api/sessions/${sessionId}/events/${eventId}`, {
        dataJson: { narrative },
      })
      .catch(() => {});
  },

  deleteEvent: (eventId) => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    if (!sessionId) return;
    set((store) => { delete store.sessionLog.events[eventId]; });
    api.del(`/api/sessions/${sessionId}/events/${eventId}`).catch(() => {});
  },

  loadMoreEvents: () => {
    const state = getState();
    if (state.sessionLog.loading) return;
    set((store) => { store.sessionLog.totalEventsToLoad += 20; });
  },

  subscribeToActiveSession: (_params) => {
    // Handled by useListenToSessionLog hook via TanStack Query
    return () => {};
  },

  subscribeToSessionEvents: (_params) => {
    // Handled by useListenToSessionLog hook via TanStack Query
    return () => {};
  },

  loadMostRecentPastSession: (params) => {
    const query = new URLSearchParams();
    if (params.campaignId) query.set("campaignId", params.campaignId);
    if (params.characterId) query.set("characterId", params.characterId);
    const endpoint = params.campaignId
      ? `/api/campaigns/${params.campaignId}/sessions`
      : `/api/characters/${params.characterId}/sessions`;
    api
      .get<SessionRow[]>(endpoint)
      .then((rows) => {
        const inactive = rows?.filter((r) => !r.isActive) ?? [];
        if (inactive.length > 0) {
          const r = inactive[0];
          set((store) => {
            store.sessionLog.mostRecentPastSession = {
              id: r.id,
              characterId: r.characterId,
              campaignId: r.campaignId,
              startedAt: new Date(r.startedAt),
              endedAt: r.endedAt ? new Date(r.endedAt) : undefined,
              title: r.title,
              isActive: r.isActive,
              summary: r.summary,
            };
          });
        } else {
          set((store) => {
            store.sessionLog.mostRecentPastSession = undefined;
            store.sessionLog.mostRecentPastSessionEvents = {};
          });
        }
      })
      .catch(console.error);
  },

  resetStore: () => {
    set((store) => {
      store.sessionLog = { ...store.sessionLog, ...defaultSessionLogSlice };
    });
  },
});
