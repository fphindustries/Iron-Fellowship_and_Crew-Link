import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import {
  PathRecommendationRequest,
  PathRecommendationOutput,
} from "./_ai.type";

export const recommendCharacterPaths = createApiFunction<
  PathRecommendationRequest,
  PathRecommendationOutput
>(
  async (params) => {
    const fn = httpsCallable<
      PathRecommendationRequest,
      PathRecommendationOutput
    >(functions, "recommendCharacterPaths");
    const result = await fn(params);
    return result.data;
  },
  "Failed to get path recommendations. Please try again."
);
