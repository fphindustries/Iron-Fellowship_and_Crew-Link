import { SectorGenerationRequest, SectorGenerationOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const generateSectorContent = (
  params: SectorGenerationRequest
): Promise<SectorGenerationOutput> =>
  aiPost<SectorGenerationOutput>("/api/ai/sector/content", params);
