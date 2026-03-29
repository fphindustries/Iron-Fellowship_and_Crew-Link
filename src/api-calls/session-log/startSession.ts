import { createApiFunction } from "api-calls/createApiFunction";
import { addDoc, Timestamp } from "firebase/firestore";
import { SessionDocumentDB } from "./_session-log.type";
import {
  getCampaignSessionsCollection,
  getCharacterSessionsCollection,
} from "./_getRef";

export const startSession = createApiFunction<
  {
    characterId?: string;
    campaignId?: string;
    title?: string;
  },
  string
>((params) => {
  const { characterId, campaignId, title } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const sessionDoc: SessionDocumentDB = {
      startedAt: Timestamp.now(),
      isActive: true,
      ...(characterId ? { characterId } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(title ? { title } : {}),
    };

    addDoc(
      campaignId
        ? getCampaignSessionsCollection(campaignId)
        : getCharacterSessionsCollection(characterId as string),
      sessionDoc
    )
      .then((docRef) => resolve(docRef.id))
      .catch((e) => reject(e));
  });
}, "Failed to start session.");
