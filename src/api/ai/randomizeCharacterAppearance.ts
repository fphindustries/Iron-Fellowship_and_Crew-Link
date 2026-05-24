import { RandomizeAppearanceRequest, RandomizeAppearanceOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const randomizeCharacterAppearance = (
  params: RandomizeAppearanceRequest
): Promise<RandomizeAppearanceOutput> =>
  aiPost<RandomizeAppearanceOutput>("/api/ai/character/appearance", params);
