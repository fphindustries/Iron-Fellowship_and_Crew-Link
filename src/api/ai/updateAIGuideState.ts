import { api } from "config/api.config";
import { AIGuideState } from "types/AIGuideState.type";

export function updateAIGuideState(
  campaignId: string,
  state: AIGuideState
): Promise<void> {
  return api.patch<void>(
    `/api/campaigns/${campaignId}/ai-guide-state`,
    state
  );
}
