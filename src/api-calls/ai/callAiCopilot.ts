import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { AiGuideRequest, AiGuideResponse } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const callAiGuide = createApiFunction<
  AiGuideRequest,
  AiGuideResponse
>(
  async (params) => {
    recordAiCall("callAiGuide", params);
    const fn = httpsCallable<AiGuideRequest, AiGuideResponse>(
      functions,
      "callAiGuide"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to get AI suggestion. Please try again."
);
