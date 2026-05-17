import { api } from "config/api.config";
import { RandomizeAppearanceRequest, RandomizeAppearanceOutput } from "./_ai.type";

export const randomizeCharacterAppearance = (
  params: RandomizeAppearanceRequest
): Promise<RandomizeAppearanceOutput> =>
  api.post<RandomizeAppearanceOutput>("/api/ai/character/appearance", params);
