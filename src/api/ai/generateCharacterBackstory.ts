import { BackstoryRequest, BackstoryOutput } from "types/AI.type";
import { aiPost, aiPostStream } from "./_aiPost";

export const generateCharacterBackstory = (
  params: BackstoryRequest
): Promise<BackstoryOutput> =>
  aiPost<BackstoryOutput>("/api/ai/character/backstory", params);

export const generateCharacterBackstoryStream = (
  params: BackstoryRequest
): AsyncGenerator<string> =>
  aiPostStream("/api/ai/character/backstory/stream", params);
