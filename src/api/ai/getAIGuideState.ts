import { api } from "config/api.config";
import { AIGuideState } from "types/AIGuideState.type";

export function getAIGuideState(
  campaignId: string
): Promise<{ stateJson: AIGuideState } | null> {
  return api.get<{ stateJson: AIGuideState } | null>(
    `/api/campaigns/${campaignId}/ai-guide-state`
  );
}
