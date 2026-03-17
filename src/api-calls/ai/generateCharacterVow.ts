import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { VowRequest, VowOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateCharacterVow = createApiFunction<VowRequest, VowOutput>(
  async (params) => {
    recordAiCall("generateCharacterVow", params);
    const fn = httpsCallable<VowRequest, VowOutput>(
      functions,
      "generateCharacterVow"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to generate vow. Please try again."
);
