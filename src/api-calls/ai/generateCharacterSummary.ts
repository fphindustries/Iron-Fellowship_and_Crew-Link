import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { CharacterSummaryRequest, CharacterSummaryOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateCharacterSummary = createApiFunction<
  CharacterSummaryRequest,
  CharacterSummaryOutput
>(
  async (params) => {
    recordAiCall("generateCharacterSummary", params);
    const fn = httpsCallable<CharacterSummaryRequest, CharacterSummaryOutput>(
      functions,
      "generateCharacterSummary"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to generate character summary. Please try again."
);
