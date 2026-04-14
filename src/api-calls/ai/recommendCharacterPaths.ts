import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { PathRecommendationRequest, PathRecommendationOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const recommendCharacterPaths = createApiFunction<
  PathRecommendationRequest,
  PathRecommendationOutput
>(
  async (params) => {
    recordAiCall("recommendCharacterPaths", params);
    const { data, error } = await supabase.functions.invoke<PathRecommendationOutput>(
      "recommend-character-paths",
      { body: params }
    );
    if (error) throw error;
    return data as PathRecommendationOutput;
  },
  "Failed to get path recommendations. Please try again."
);
