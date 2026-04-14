import { useEffect, useRef } from "react";
import { useStore } from "stores/store";

export function useListenToSessionLog() {
  const characterId = useStore(
    (store) => store.characters.currentCharacter.currentCharacterId
  );
  const campaignId = useStore(
    (store) => store.campaigns.currentCampaign.currentCampaignId
  );

  const subscribeToActiveSession = useStore(
    (store) => store.sessionLog.subscribeToActiveSession
  );
  const previousSessionUnsubscribe = useRef<((() => void) | undefined)>(
    undefined
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined = undefined;

    if (characterId || campaignId) {
      unsubscribe = subscribeToActiveSession({ campaignId, characterId });
    }
    if (previousSessionUnsubscribe.current) {
      previousSessionUnsubscribe.current();
    }
    if (unsubscribe) {
      previousSessionUnsubscribe.current = unsubscribe;
    }
  }, [characterId, campaignId, subscribeToActiveSession]);

  useEffect(() => {
    return () => {
      previousSessionUnsubscribe.current &&
        previousSessionUnsubscribe.current();
    };
  }, []);

  const activeSessionId = useStore(
    (store) => store.sessionLog.activeSessionId
  );
  const totalEventsToLoad = useStore(
    (store) => store.sessionLog.totalEventsToLoad
  );
  const subscribeToSessionEvents = useStore(
    (store) => store.sessionLog.subscribeToSessionEvents
  );
  const previousEventsUnsubscribe = useRef<((() => void) | undefined)>(undefined);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined = undefined;

    if (activeSessionId && (characterId || campaignId)) {
      unsubscribe = subscribeToSessionEvents({
        sessionId: activeSessionId,
        campaignId,
        characterId,
        totalEventsToLoad,
      });
    }
    if (previousEventsUnsubscribe.current) {
      previousEventsUnsubscribe.current();
    }
    if (unsubscribe) {
      previousEventsUnsubscribe.current = unsubscribe;
    }
  }, [
    activeSessionId,
    campaignId,
    characterId,
    totalEventsToLoad,
    subscribeToSessionEvents,
  ]);

  useEffect(() => {
    return () => {
      previousEventsUnsubscribe.current &&
        previousEventsUnsubscribe.current();
    };
  }, []);

  const loadMostRecentPastSession = useStore(
    (store) => store.sessionLog.loadMostRecentPastSession
  );

  useEffect(() => {
    if (!activeSessionId && (characterId || campaignId)) {
      loadMostRecentPastSession({ campaignId, characterId });
    }
  }, [activeSessionId, campaignId, characterId, loadMostRecentPastSession]);
}
