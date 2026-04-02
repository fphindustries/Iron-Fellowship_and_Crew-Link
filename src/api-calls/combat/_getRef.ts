import { firestore } from "config/firebase.config";
import {
  collection,
  CollectionReference,
  doc,
  DocumentReference,
} from "firebase/firestore";
import { CombatDocument } from "types/combat.types";

export function getCombatsRef(
  characterId: string,
  campaignId?: string
): CollectionReference<CombatDocument> {
  const path = campaignId
    ? `/campaigns/${campaignId}/combats`
    : `/characters/${characterId}/combats`;
  return collection(firestore, path) as CollectionReference<CombatDocument>;
}

export function getCombatDoc(
  combatId: string,
  characterId: string,
  campaignId?: string
): DocumentReference<CombatDocument> {
  const path = campaignId
    ? `/campaigns/${campaignId}/combats/${combatId}`
    : `/characters/${characterId}/combats/${combatId}`;
  return doc(firestore, path) as DocumentReference<CombatDocument>;
}
