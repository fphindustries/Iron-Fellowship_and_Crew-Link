import {
  onSnapshot,
  query,
  where,
  limit,
  Unsubscribe,
} from "firebase/firestore";
import { CombatDocument } from "types/combat.types";
import { getCombatsRef } from "./_getRef";

export function listenToActiveCombat(
  characterId: string,
  callback: (combat: (CombatDocument & { id: string }) | null) => void,
  campaignId?: string
): Unsubscribe {
  const ref = getCombatsRef(characterId, campaignId);
  const q = query(ref, where("active", "==", true), limit(1));

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const docSnap = snapshot.docs[0];
      const data = docSnap.data() as Omit<CombatDocument, "id">;
      callback({ ...data, id: docSnap.id });
    }
  });
}
