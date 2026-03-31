import { createApiFunction } from "api-calls/createApiFunction";
import { Timestamp, updateDoc } from "firebase/firestore";
import {
  getCampaignSessionDoc,
  getCharacterSessionDoc,
} from "./_getRef";

export const endSession = createApiFunction<
  {
    sessionId: string;
    characterId?: string;
    campaignId?: string;
    summary?: string;
  },
  void
>((params) => {
  const { sessionId, characterId, campaignId, summary } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const sessionDocRef = campaignId
      ? getCampaignSessionDoc(campaignId, sessionId)
      : getCharacterSessionDoc(characterId as string, sessionId);

    updateDoc(sessionDocRef, {
      isActive: false,
      endedAt: Timestamp.now(),
      ...(summary ? { summary } : {}),
    })
      .then(() => resolve())
      .catch((e) => reject(e));
  });
}, "Failed to end session.");
