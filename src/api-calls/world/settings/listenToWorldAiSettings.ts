import { onSnapshot } from "firebase/firestore";
import { WorldAiSettings } from "./_worldSettings.type";
import { getWorldAiSettingsDoc } from "./_getRef";

export const listenToWorldAiSettings = (
  worldId: string,
  onSettings: (settings: WorldAiSettings | undefined) => void
) => {
  return onSnapshot(getWorldAiSettingsDoc(worldId), (snapshot) => {
    onSettings(snapshot.data() ?? undefined);
  });
};
