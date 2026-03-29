import {
  Unsubscribe,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { SessionDocument } from "types/SessionLog.type";
import {
  convertSessionFromDatabase,
  getCampaignSessionsCollection,
  getCharacterSessionsCollection,
} from "./_getRef";

export function listenToActiveSession(params: {
  campaignId?: string;
  characterId?: string;
  onSession: (sessionId: string, session: SessionDocument) => void;
  onNoSession: () => void;
  onError: (error: string) => void;
}): Unsubscribe {
  const { campaignId, characterId, onSession, onNoSession, onError } = params;

  if (!campaignId && !characterId) {
    onError("Either campaign or character ID must be defined.");
    return () => {};
  }

  const sessionsCollection = campaignId
    ? getCampaignSessionsCollection(campaignId)
    : getCharacterSessionsCollection(characterId as string);

  return onSnapshot(
    query(
      sessionsCollection,
      where("isActive", "==", true),
      orderBy("startedAt", "desc"),
      limit(1)
    ),
    (snapshot) => {
      if (snapshot.empty) {
        onNoSession();
      } else {
        const docSnap = snapshot.docs[0];
        onSession(docSnap.id, convertSessionFromDatabase(docSnap.data()));
      }
    },
    (error) => {
      console.error(error);
      onError("Error listening to active session.");
    }
  );
}
