import { BackstoryRequest, BackstoryOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const generateCharacterBackstory = (
  params: BackstoryRequest
): Promise<BackstoryOutput> =>
  aiPost<BackstoryOutput>("/api/ai/character/backstory", params);
