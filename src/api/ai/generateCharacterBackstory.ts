import { api } from "config/api.config";
import { BackstoryRequest, BackstoryOutput } from "types/AI.type";

export const generateCharacterBackstory = (
  params: BackstoryRequest
): Promise<BackstoryOutput> =>
  api.post<BackstoryOutput>("/api/ai/character/backstory", params);
