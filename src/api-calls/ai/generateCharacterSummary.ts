import { api } from "config/api.config";
import { CharacterSummaryRequest, CharacterSummaryOutput } from "./_ai.type";

export const generateCharacterSummary = (
  params: CharacterSummaryRequest
): Promise<CharacterSummaryOutput> =>
  api.post<CharacterSummaryOutput>("/api/ai/character/summary", params);
