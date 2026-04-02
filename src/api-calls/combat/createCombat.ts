import { addDoc, serverTimestamp } from "firebase/firestore";
import { CombatDocument, CombatEnemy, CombatPosition } from "types/combat.types";
import { Difficulty } from "types/Track.type";
import { getCombatsRef } from "./_getRef";

export async function createCombat(params: {
  characterId: string;
  campaignId?: string;
  sessionId: string;
  objective: string;
  enemies: CombatEnemy[];
  position: CombatPosition;
  difficulty: Difficulty;
  trackId?: string;
}): Promise<string> {
  const {
    characterId,
    campaignId,
    sessionId,
    objective,
    enemies,
    position,
    difficulty,
    trackId,
  } = params;

  const data = {
    characterId,
    ...(campaignId ? { campaignId } : {}),
    sessionId,
    objective,
    enemies,
    position,
    difficulty,
    ...(trackId ? { trackId } : {}),
    active: true,
    createdAt: serverTimestamp(),
  } as Omit<CombatDocument, "id">;

  const ref = getCombatsRef(characterId, campaignId);
  const docRef = await addDoc(ref, data);
  return docRef.id;
}
