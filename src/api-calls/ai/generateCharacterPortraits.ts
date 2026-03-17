import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { PortraitGenerationRequest, PortraitGenerationOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateCharacterPortraits = createApiFunction<
  PortraitGenerationRequest,
  PortraitGenerationOutput
>(
  async (params) => {
    recordAiCall("generateCharacterPortraits", params);
    const fn = httpsCallable<PortraitGenerationRequest, PortraitGenerationOutput>(
      functions,
      "generateCharacterPortraits",
      { timeout: 120000 }
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to generate character portraits. Please try again."
);
