import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { AiCopilotRequest, AiCopilotResponse } from "./_ai.type";

export const callAiCopilot = createApiFunction<
  AiCopilotRequest,
  AiCopilotResponse
>(
  async (params) => {
    const fn = httpsCallable<AiCopilotRequest, AiCopilotResponse>(
      functions,
      "callAiCopilot"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to get AI suggestion. Please try again."
);
