import {
  getDocs,
  limit,
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

export async function getMostRecentSession(params: {
  campaignId?: string;
  characterId?: string;
}): Promise<{ id: string; session: SessionDocument } | null> {
  const { campaignId, characterId } = params;

  if (!campaignId && !characterId) {
    return null;
  }

  const sessionsCollection = campaignId
    ? getCampaignSessionsCollection(campaignId)
    : getCharacterSessionsCollection(characterId as string);

  const snapshot = await getDocs(
    query(
      sessionsCollection,
      where("isActive", "==", false),
      orderBy("startedAt", "desc"),
      limit(1)
    )
  );

  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  return {
    id: docSnap.id,
    session: convertSessionFromDatabase(docSnap.data()),
  };
}
