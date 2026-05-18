import { api } from "config/api.config";
import { PathRecommendationRequest, PathRecommendationOutput } from "types/AI.type";

export const recommendCharacterPaths = (
  params: PathRecommendationRequest
): Promise<PathRecommendationOutput> =>
  api.post<PathRecommendationOutput>("/api/ai/character/paths", params);
