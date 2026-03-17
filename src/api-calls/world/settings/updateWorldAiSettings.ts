import { ApiFunction } from "api-calls/createApiFunction";
import { setDoc } from "firebase/firestore";
import { WorldAiSettings } from "./_worldSettings.type";
import { getWorldAiSettingsDoc } from "./_getRef";

export const updateWorldAiSettings: ApiFunction<
  { worldId: string; settings: Partial<WorldAiSettings> },
  void
> = (params) => {
  const { worldId, settings } = params;
  return setDoc(getWorldAiSettingsDoc(worldId), settings, {
    merge: true,
  });
};
