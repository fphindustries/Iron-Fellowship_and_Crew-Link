import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { BackstoryRequest, BackstoryOutput } from "./_ai.type";

export const generateCharacterBackstory = createApiFunction<
  BackstoryRequest,
  BackstoryOutput
>(
  async (params) => {
    const fn = httpsCallable<BackstoryRequest, BackstoryOutput>(
      functions,
      "generateCharacterBackstory"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to generate backstory. Please try again."
);
