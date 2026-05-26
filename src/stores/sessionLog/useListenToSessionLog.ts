import { useEffect } from "react";
import { useStore } from "stores/store";
import {
  useActiveSessionQuery,
  useSessionEventsQuery,
} from "hooks/queries/useSessionLogQuery";
import { SessionDocument, SessionLogEvent, SESSION_EVENT_TYPE } from "types/SessionLog.type";

export function useListenToSessionLog() {
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );

  const { data: activeSessionData } = useActiveSessionQuery({
    characterId: characterId ?? undefined,
    campaignId: campaignId ?? undefined,
  });

  useEffect(() => {
    if (activeSessionData === undefined) return;
    useStore.setState((store) => {
      if (activeSessionData) {
        store.sessionLog.activeSessionId = activeSessionData.id;
        store.sessionLog.activeSession = {
          characterId: activeSessionData.characterId,
          campaignId: activeSessionData.campaignId,
          startedAt: new Date(activeSessionData.startedAt),
          endedAt: activeSessionData.endedAt
            ? new Date(activeSessionData.endedAt)
            : undefined,
          title: activeSessionData.title,
          isActive: activeSessionData.isActive,
          summary: activeSessionData.summary,
        } as SessionDocument;
      } else {
        store.sessionLog.activeSessionId = undefined;
        store.sessionLog.activeSession = undefined;
      }
    });
  }, [activeSessionData]);

  const activeSessionId = useStore(
    (store) => store.sessionLog.activeSessionId
  );

  const { data: eventsData } = useSessionEventsQuery(activeSessionId);

  useEffect(() => {
    if (!eventsData) return;
    const eventsMap: Record<string, SessionLogEvent> = {};
    for (const row of eventsData) {
      const event = {
        ...(row.dataJson ?? {}),
        type: row.type as SESSION_EVENT_TYPE,
        sessionId: row.sessionId,
        characterId: row.characterId,
        characterName: row.characterName,
        uid: row.createdBy ?? "",
        timestamp: new Date(row.createdAt),
      } as SessionLogEvent;
      eventsMap[row.id] = event;
    }
    useStore.setState((store) => {
      store.sessionLog.events = eventsMap;
      store.sessionLog.loading = false;
    });
  }, [eventsData]);

  const loadMostRecentPastSession = useStore(
    (store) => store.sessionLog.loadMostRecentPastSession
  );

  useEffect(() => {
    if (!activeSessionId && (characterId || campaignId)) {
      loadMostRecentPastSession({
        campaignId: campaignId ?? undefined,
        characterId: characterId ?? undefined,
      });
    }
  }, [activeSessionId, campaignId, characterId, loadMostRecentPastSession]);
}
