import { VowRequest, VowOutput } from "types/AI.type";
import { aiPost, aiPostStream } from "./_aiPost";

export const generateCharacterVow = (
  params: VowRequest
): Promise<VowOutput> =>
  aiPost<VowOutput>("/api/ai/character/vow", params);

export const generateCharacterVowStream = (
  params: VowRequest
): AsyncGenerator<string> =>
  aiPostStream("/api/ai/character/vow/stream", params);
