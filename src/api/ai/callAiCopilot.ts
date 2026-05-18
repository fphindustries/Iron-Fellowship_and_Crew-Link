import { api } from "config/api.config";
import { AiGuideRequest, AiGuideResponse } from "types/AI.type";

export const callAiGuide = (params: AiGuideRequest): Promise<AiGuideResponse> =>
  api.post<AiGuideResponse>("/api/ai/guide", params);
