import { CharacterSummaryRequest, CharacterSummaryOutput } from "types/AI.type";
import { aiPost, aiPostStream } from "./_aiPost";

export const generateCharacterSummary = (
  params: CharacterSummaryRequest
): Promise<CharacterSummaryOutput> =>
  aiPost<CharacterSummaryOutput>("/api/ai/character/summary", params);

export const generateCharacterSummaryStream = (
  params: CharacterSummaryRequest
): AsyncGenerator<string> =>
  aiPostStream("/api/ai/character/summary/stream", params);
