import { api } from "config/api.config";
import { PortraitGenerationRequest, PortraitGenerationOutput } from "./_ai.type";

export const generateCharacterPortraits = (
  params: PortraitGenerationRequest
): Promise<PortraitGenerationOutput> =>
  api.post<PortraitGenerationOutput>("/api/ai/character/portraits", params);
