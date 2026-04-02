import { updateDoc } from "firebase/firestore";
import { CombatDocument } from "types/combat.types";
import { getCombatDoc } from "./_getRef";

export async function updateCombat(
  combatId: string,
  characterId: string,
  patch: Partial<Omit<CombatDocument, "id" | "characterId" | "createdAt">>,
  campaignId?: string
): Promise<void> {
  const ref = getCombatDoc(combatId, characterId, campaignId);
  await updateDoc(ref, patch);
}
