import {
  Unsubscribe,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { SessionLogEvent } from "types/SessionLog.type";
import {
  constructCampaignSessionsCollectionPath,
  constructCharacterSessionsCollectionPath,
  convertEventFromDatabase,
  getSessionEventsCollection,
} from "./_getRef";

export function listenToSessionEvents(params: {
  sessionId: string;
  campaignId?: string;
  characterId?: string;
  totalEventsToLoad: number;
  updateEvent: (eventId: string, event: SessionLogEvent) => void;
  removeEvent: (eventId: string) => void;
  onError: (error: string) => void;
}): Unsubscribe {
  const {
    sessionId,
    campaignId,
    characterId,
    totalEventsToLoad,
    updateEvent,
    removeEvent,
    onError,
  } = params;

  if (!campaignId && !characterId) {
    onError("Either campaign or character ID must be defined.");
    return () => {};
  }

  const parentPath = campaignId
    ? constructCampaignSessionsCollectionPath(campaignId)
    : constructCharacterSessionsCollectionPath(characterId as string);

  const eventsCollection = getSessionEventsCollection(parentPath, sessionId);

  return onSnapshot(
    query(
      eventsCollection,
      orderBy("timestamp", "desc"),
      limit(totalEventsToLoad)
    ),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const event = convertEventFromDatabase(change.doc.data());
          updateEvent(change.doc.id, event);
        } else if (change.type === "removed") {
          removeEvent(change.doc.id);
        }
      });
    },
    (error) => {
      console.error(error);
      onError("Error listening to session events.");
    }
  );
}
