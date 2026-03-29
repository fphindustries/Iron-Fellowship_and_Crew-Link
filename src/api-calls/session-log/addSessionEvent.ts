import { createApiFunction } from "api-calls/createApiFunction";
import { addDoc } from "firebase/firestore";
import { SessionLogEvent } from "types/SessionLog.type";
import {
  convertEventToDatabase,
  getSessionEventsCollection,
} from "./_getRef";
import {
  constructCampaignSessionsCollectionPath,
  constructCharacterSessionsCollectionPath,
} from "./_getRef";

export const addSessionEvent = createApiFunction<
  {
    sessionId: string;
    event: SessionLogEvent;
    characterId?: string;
    campaignId?: string;
  },
  string
>((params) => {
  const { sessionId, event, characterId, campaignId } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const parentPath = campaignId
      ? constructCampaignSessionsCollectionPath(campaignId)
      : constructCharacterSessionsCollectionPath(characterId as string);

    addDoc(
      getSessionEventsCollection(parentPath, sessionId),
      convertEventToDatabase(event)
    )
      .then((docRef) => resolve(docRef.id))
      .catch((e) => reject(e));
  });
}, "Failed to log session event.");
