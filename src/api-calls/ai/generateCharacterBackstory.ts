import { api } from "config/api.config";
import { BackstoryRequest, BackstoryOutput } from "./_ai.type";

export const generateCharacterBackstory = (
  params: BackstoryRequest
): Promise<BackstoryOutput> =>
  api.post<BackstoryOutput>("/api/ai/character/backstory", params);
