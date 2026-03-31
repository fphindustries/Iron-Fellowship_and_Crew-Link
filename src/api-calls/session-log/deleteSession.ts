import { createApiFunction } from "api-calls/createApiFunction";
import { deleteDoc } from "firebase/firestore";
import { getCampaignSessionDoc, getCharacterSessionDoc } from "./_getRef";

export const deleteSession = createApiFunction<
  {
    sessionId: string;
    characterId?: string;
    campaignId?: string;
  },
  void
>(
  (params) => {
    const { sessionId, characterId, campaignId } = params;

    if (!campaignId && !characterId) {
      return Promise.reject(
        new Error("Either campaign or character ID must be defined.")
      );
    }

    const docRef = campaignId
      ? getCampaignSessionDoc(campaignId, sessionId)
      : getCharacterSessionDoc(characterId as string, sessionId);

    return deleteDoc(docRef);
  },
  "Failed to delete session."
);
