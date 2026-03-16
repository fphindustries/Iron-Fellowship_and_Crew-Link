import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { VowRequest, VowOutput } from "./_ai.type";

export const generateCharacterVow = createApiFunction<VowRequest, VowOutput>(
  async (params) => {
    const fn = httpsCallable<VowRequest, VowOutput>(
      functions,
      "generateCharacterVow"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to generate vow. Please try again."
);
