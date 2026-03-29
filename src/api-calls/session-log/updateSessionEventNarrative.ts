import { createApiFunction } from "api-calls/createApiFunction";
import { updateDoc } from "firebase/firestore";
import {
  constructCampaignSessionsCollectionPath,
  constructCharacterSessionsCollectionPath,
  getSessionEventDoc,
} from "./_getRef";

export const updateSessionEventNarrative = createApiFunction<
  {
    sessionId: string;
    eventId: string;
    narrative: string;
    characterId?: string;
    campaignId?: string;
  },
  void
>((params) => {
  const { sessionId, eventId, narrative, characterId, campaignId } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const parentPath = campaignId
      ? constructCampaignSessionsCollectionPath(campaignId)
      : constructCharacterSessionsCollectionPath(characterId as string);

    updateDoc(getSessionEventDoc(parentPath, sessionId, eventId), { narrative })
      .then(() => resolve())
      .catch((e) => reject(e));
  });
}, "Failed to update session event narrative.");
