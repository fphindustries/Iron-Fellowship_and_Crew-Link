import { PortraitGenerationRequest, PortraitGenerationOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const generateCharacterPortraits = (
  params: PortraitGenerationRequest
): Promise<PortraitGenerationOutput> =>
  aiPost<PortraitGenerationOutput>("/api/ai/character/portraits", params);
