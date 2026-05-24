import { VowRequest, VowOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const generateCharacterVow = (
  params: VowRequest
): Promise<VowOutput> =>
  aiPost<VowOutput>("/api/ai/character/vow", params);
