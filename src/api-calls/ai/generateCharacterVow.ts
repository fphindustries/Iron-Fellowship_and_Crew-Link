import { api } from "config/api.config";
import { VowRequest, VowOutput } from "./_ai.type";

export const generateCharacterVow = (
  params: VowRequest
): Promise<VowOutput> =>
  api.post<VowOutput>("/api/ai/character/vow", params);
