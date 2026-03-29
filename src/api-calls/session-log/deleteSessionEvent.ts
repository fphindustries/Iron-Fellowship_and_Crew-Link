import { createApiFunction } from "api-calls/createApiFunction";
import { deleteDoc } from "firebase/firestore";
import {
  constructCampaignSessionsCollectionPath,
  constructCharacterSessionsCollectionPath,
  getSessionEventDoc,
} from "./_getRef";

export const deleteSessionEvent = createApiFunction<
  {
    sessionId: string;
    eventId: string;
    characterId?: string;
    campaignId?: string;
  },
  void
>((params) => {
  const { sessionId, eventId, characterId, campaignId } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const parentPath = campaignId
      ? constructCampaignSessionsCollectionPath(campaignId)
      : constructCharacterSessionsCollectionPath(characterId as string);

    deleteDoc(getSessionEventDoc(parentPath, sessionId, eventId))
      .then(() => resolve())
      .catch((e) => reject(e));
  });
}, "Failed to delete session event.");
