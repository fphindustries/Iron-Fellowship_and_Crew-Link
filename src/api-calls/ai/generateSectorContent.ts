import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import {
  SectorGenerationRequest,
  SectorGenerationOutput,
} from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateSectorContent = createApiFunction<
  SectorGenerationRequest,
  SectorGenerationOutput
>(
  async (params) => {
    recordAiCall("generateSectorContent", params);
    const fn = httpsCallable<SectorGenerationRequest, SectorGenerationOutput>(
      functions,
      "generateSectorContent"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to generate sector content. Please try again."
);
