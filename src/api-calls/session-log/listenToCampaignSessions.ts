import { Unsubscribe, onSnapshot, orderBy, query } from "firebase/firestore";
import { SessionDocument } from "types/SessionLog.type";
import {
  convertSessionFromDatabase,
  getCampaignSessionsCollection,
} from "./_getRef";

export function listenToCampaignSessions(params: {
  campaignId: string;
  onUpdate: (sessions: { id: string; session: SessionDocument }[]) => void;
  onError: (error: string) => void;
}): Unsubscribe {
  const { campaignId, onUpdate, onError } = params;

  const collection = getCampaignSessionsCollection(campaignId);

  return onSnapshot(
    query(collection, orderBy("startedAt", "desc")),
    (snapshot) => {
      const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        session: convertSessionFromDatabase(doc.data()),
      }));
      onUpdate(sessions);
    },
    (error) => {
      console.error(error);
      onError("Error listening to campaign sessions.");
    }
  );
}
