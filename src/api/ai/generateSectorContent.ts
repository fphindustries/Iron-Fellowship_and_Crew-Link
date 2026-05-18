import { api } from "config/api.config";
import { SectorGenerationRequest, SectorGenerationOutput } from "types/AI.type";

export const generateSectorContent = (
  params: SectorGenerationRequest
): Promise<SectorGenerationOutput> =>
  api.post<SectorGenerationOutput>("/api/ai/sector/content", params);
