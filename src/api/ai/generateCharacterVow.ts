import { api } from "config/api.config";
import { VowRequest, VowOutput } from "types/AI.type";

export const generateCharacterVow = (
  params: VowRequest
): Promise<VowOutput> =>
  api.post<VowOutput>("/api/ai/character/vow", params);
