import { firestore } from "config/firebase.config";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  Timestamp,
} from "firebase/firestore";
import { AiEventDocument } from "./_ai.type";

export function listenToAiEvents(params: {
  campaignId: string;
  onEvent: (eventId: string, event: AiEventDocument) => void;
  onRemove: (eventId: string) => void;
  onError: (error: string) => void;
}) {
  const { campaignId, onEvent, onRemove, onError } = params;

  const col = collection(
    firestore,
    `/campaigns/${campaignId}/ai-events`
  );

  return onSnapshot(
    query(col, orderBy("createdAt", "desc"), limit(50)),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          const createdAt =
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : new Date();
          onEvent(change.doc.id, {
            ...data,
            createdAt,
          } as AiEventDocument);
        } else if (change.type === "removed") {
          onRemove(change.doc.id);
        }
      });
    },
    (err) => {
      console.error(err);
      onError("Failed to load AI events.");
    }
  );
}
