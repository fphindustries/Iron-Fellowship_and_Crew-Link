import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { RandomizeAppearanceRequest, RandomizeAppearanceOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const randomizeCharacterAppearance = createApiFunction<
  RandomizeAppearanceRequest,
  RandomizeAppearanceOutput
>(
  async (params) => {
    recordAiCall("randomizeCharacterAppearance", params);
    const fn = httpsCallable<RandomizeAppearanceRequest, RandomizeAppearanceOutput>(
      functions,
      "randomizeCharacterAppearance"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to generate appearance suggestions. Please try again."
);
