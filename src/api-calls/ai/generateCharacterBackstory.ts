import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { BackstoryRequest, BackstoryOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateCharacterBackstory = createApiFunction<
  BackstoryRequest,
  BackstoryOutput
>(
  async (params) => {
    recordAiCall("generateCharacterBackstory", params);
    const fn = httpsCallable<BackstoryRequest, BackstoryOutput>(
      functions,
      "generateCharacterBackstory"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to generate backstory. Please try again."
);
