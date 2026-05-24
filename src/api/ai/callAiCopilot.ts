import { AiGuideRequest, AiGuideResponse } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const callAiGuide = (params: AiGuideRequest): Promise<AiGuideResponse> =>
  aiPost<AiGuideResponse>("/api/ai/guide", params);
