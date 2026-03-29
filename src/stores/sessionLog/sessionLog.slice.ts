import { CreateSliceType } from "stores/store.type";
import { SessionLogSlice } from "./sessionLog.slice.type";
import { defaultSessionLogSlice } from "./sessionLog.slice.default";
import { startSession as startSessionApi } from "api-calls/session-log/startSession";
import { endSession as endSessionApi } from "api-calls/session-log/endSession";
import { addSessionEvent } from "api-calls/session-log/addSessionEvent";
import { updateSessionEventNarrative } from "api-calls/session-log/updateSessionEventNarrative";
import { deleteSessionEvent } from "api-calls/session-log/deleteSessionEvent";
import { listenToActiveSession } from "api-calls/session-log/listenToActiveSession";
import { listenToSessionEvents } from "api-calls/session-log/listenToSessionEvents";
import { getMostRecentSession } from "api-calls/session-log/getMostRecentSession";
import { SESSION_EVENT_TYPE, SessionLogEvent } from "types/SessionLog.type";
import { ignoreApiError } from "api-calls/createApiFunction";

export const createSessionLogSlice: CreateSliceType<SessionLogSlice> = (
  set,
  getState
) => ({
  ...defaultSessionLogSlice,

  startSession: (params) => {
    const state = getState();
    if (state.sessionLog.activeSessionId) {
      return Promise.reject("A session is already active.");
    }
    return startSessionApi(params).then((sessionId) => {
      set((store) => {
        store.sessionLog.activeSessionId = sessionId;
        store.sessionLog.activeSession = {
          startedAt: new Date(),
          isActive: true,
          characterId: params.characterId,
          campaignId: params.campaignId,
          title: params.title,
        };
        store.sessionLog.events = {};
      });
      return sessionId;
    });
  },

  endSession: () => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    const campaignId = state.campaigns.currentCampaign.currentCampaignId;
    const characterId =
      state.characters.currentCharacter.currentCharacterId;

    if (!sessionId) {
      return Promise.reject("No active session to end.");
    }

    return endSessionApi({ sessionId, characterId, campaignId }).then(() => {
      set((store) => {
        store.sessionLog.activeSessionId = undefined;
        store.sessionLog.activeSession = undefined;
      });
    });
  },

  logMoveEvent: (eventData) => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    if (!sessionId) return;

    const campaignId = state.campaigns.currentCampaign.currentCampaignId;
    const characterId =
      state.characters.currentCharacter.currentCharacterId ?? null;
    const characterName =
      state.characters.currentCharacter.currentCharacter?.name ?? "";
    const uid = state.auth.uid;

    const event: SessionLogEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.MOVE,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };

    addSessionEvent({
      sessionId,
      event,
      characterId: characterId ?? undefined,
      campaignId,
    }).catch(ignoreApiError);
  },

  logStatChangeEvent: (eventData) => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    if (!sessionId) return;

    const campaignId = state.campaigns.currentCampaign.currentCampaignId;
    const characterId =
      state.characters.currentCharacter.currentCharacterId ?? null;
    const characterName =
      state.characters.currentCharacter.currentCharacter?.name ?? "";
    const uid = state.auth.uid;

    const event: SessionLogEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.STAT_CHANGE,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };

    addSessionEvent({
      sessionId,
      event,
      characterId: characterId ?? undefined,
      campaignId,
    }).catch(ignoreApiError);
  },

  logProgressEvent: (eventData) => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    if (!sessionId) return;

    const campaignId = state.campaigns.currentCampaign.currentCampaignId;
    const characterId =
      state.characters.currentCharacter.currentCharacterId ?? null;
    const characterName =
      state.characters.currentCharacter.currentCharacter?.name ?? "";
    const uid = state.auth.uid;

    const event: SessionLogEvent = {
      ...eventData,
      type: SESSION_EVENT_TYPE.PROGRESS,
      sessionId,
      timestamp: new Date(),
      characterId,
      characterName,
      uid,
    };

    addSessionEvent({
      sessionId,
      event,
      characterId: characterId ?? undefined,
      campaignId,
    }).catch(ignoreApiError);
  },

  logJournalEvent: (text, isAiGenerated = false) => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    if (!sessionId) return;

    const campaignId = state.campaigns.currentCampaign.currentCampaignId;
    const characterId =
      state.characters.currentCharacter.currentCharacterId ?? null;
    const characterName =
      state.characters.currentCharacter.currentCharacter?.name ?? "";
    const uid = state.auth.uid;

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

    addSessionEvent({
      sessionId,
      event,
      characterId: characterId ?? undefined,
      campaignId,
    }).catch(ignoreApiError);
  },

  updateMoveEventNarrative: (eventId, narrative) => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    if (!sessionId) return;

    const campaignId = state.campaigns.currentCampaign.currentCampaignId;
    const characterId =
      state.characters.currentCharacter.currentCharacterId ?? undefined;

    set((store) => {
      const event = store.sessionLog.events[eventId];
      if (event && event.type === "move") {
        (event as import("types/SessionLog.type").MoveSessionEvent).narrative =
          narrative;
      }
    });

    updateSessionEventNarrative({
      sessionId,
      eventId,
      narrative,
      characterId,
      campaignId,
    }).catch(ignoreApiError);
  },

  deleteEvent: (eventId) => {
    const state = getState();
    const sessionId = state.sessionLog.activeSessionId;
    if (!sessionId) return;

    const campaignId = state.campaigns.currentCampaign.currentCampaignId;
    const characterId =
      state.characters.currentCharacter.currentCharacterId ?? undefined;

    set((store) => {
      delete store.sessionLog.events[eventId];
    });

    deleteSessionEvent({
      sessionId,
      eventId,
      characterId,
      campaignId,
    }).catch(ignoreApiError);
  },

  loadMoreEvents: () => {
    const state = getState();
    if (state.sessionLog.loading) {
      return;
    }

    set((store) => {
      store.sessionLog.totalEventsToLoad += 20;
    });
  },

  subscribeToActiveSession: (params) => {
    return listenToActiveSession({
      ...params,
      onSession: (sessionId, session) => {
        set((store) => {
          store.sessionLog.activeSessionId = sessionId;
          store.sessionLog.activeSession = session;
        });
      },
      onNoSession: () => {
        set((store) => {
          store.sessionLog.activeSessionId = undefined;
          store.sessionLog.activeSession = undefined;
        });
      },
      onError: (error) => {
        console.error(error);
      },
    });
  },

  subscribeToSessionEvents: (params) => {
    set((store) => {
      store.sessionLog.loading = true;
    });
    return listenToSessionEvents({
      ...params,
      updateEvent: (eventId, event) => {
        set((store) => {
          store.sessionLog.events[eventId] = event;
          store.sessionLog.loading = false;
        });
      },
      removeEvent: (eventId) => {
        set((store) => {
          delete store.sessionLog.events[eventId];
        });
      },
      onError: (error) => {
        console.error(error);
        set((store) => {
          store.sessionLog.loading = false;
        });
      },
    });
  },

  loadMostRecentPastSession: (params) => {
    getMostRecentSession(params)
      .then((result) => {
        if (result) {
          set((store) => {
            store.sessionLog.mostRecentPastSession = {
              ...result.session,
              id: result.id,
            };
          });
        } else {
          set((store) => {
            store.sessionLog.mostRecentPastSession = undefined;
            store.sessionLog.mostRecentPastSessionEvents = {};
          });
        }
      })
      .catch((e) => {
        console.error(e);
      });
  },

  resetStore: () => {
    set((store) => {
      store.sessionLog = { ...store.sessionLog, ...defaultSessionLogSlice };
    });
  },
});
