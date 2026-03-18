import { getDoc } from "firebase/firestore";
import { WorldAiSettings } from "./_worldSettings.type";
import { getWorldAiSettingsDoc } from "./_getRef";

export async function getWorldAiSettings(
  worldId: string
): Promise<WorldAiSettings | undefined> {
  const snapshot = await getDoc(getWorldAiSettingsDoc(worldId));
  return snapshot.exists() ? (snapshot.data() as WorldAiSettings) : undefined;
}
