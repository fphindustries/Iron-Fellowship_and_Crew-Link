import { CharacterSummaryRequest, CharacterSummaryOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const generateCharacterSummary = (
  params: CharacterSummaryRequest
): Promise<CharacterSummaryOutput> =>
  aiPost<CharacterSummaryOutput>("/api/ai/character/summary", params);
