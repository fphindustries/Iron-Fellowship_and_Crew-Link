import { serverTimestamp, updateDoc } from "firebase/firestore";
import { getCombatDoc } from "./_getRef";

export async function endCombat(
  combatId: string,
  characterId: string,
  campaignId?: string
): Promise<void> {
  const ref = getCombatDoc(combatId, characterId, campaignId);
  await updateDoc(ref, { active: false, endedAt: serverTimestamp() });
}
