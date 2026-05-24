import { PathRecommendationRequest, PathRecommendationOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const recommendCharacterPaths = (
  params: PathRecommendationRequest
): Promise<PathRecommendationOutput> =>
  aiPost<PathRecommendationOutput>("/api/ai/character/paths", params);
