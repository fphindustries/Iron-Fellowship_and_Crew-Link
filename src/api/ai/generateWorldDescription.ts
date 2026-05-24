import { WorldDescriptionRequest, WorldDescriptionOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const generateWorldDescription = (
  params: WorldDescriptionRequest
): Promise<WorldDescriptionOutput> =>
  aiPost<WorldDescriptionOutput>("/api/ai/world/description", params);
