import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import {
  WorldDescriptionRequest,
  WorldDescriptionOutput,
} from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateWorldDescription = createApiFunction<
  WorldDescriptionRequest,
  WorldDescriptionOutput
>(
  async (params) => {
    recordAiCall("generateWorldDescription", params);
    const fn = httpsCallable<WorldDescriptionRequest, WorldDescriptionOutput>(
      functions,
      "generateWorldDescription"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to generate world description. Please try again."
);
