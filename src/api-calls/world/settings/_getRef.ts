import { firestore } from "config/firebase.config";
import { DocumentReference, doc } from "firebase/firestore";
import { WorldAiSettings } from "./_worldSettings.type";

export function constructWorldAiSettingsDocPath(worldId: string) {
  return `/worlds/${worldId}/settings/ai-prompts`;
}

export function getWorldAiSettingsDoc(worldId: string) {
  return doc(
    firestore,
    constructWorldAiSettingsDocPath(worldId)
  ) as DocumentReference<WorldAiSettings>;
}
