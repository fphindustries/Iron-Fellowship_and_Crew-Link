import { useFeatureFlag } from "./useFeatureFlag";

export function useAiCopilot(): boolean {
  return useFeatureFlag("ai-copilot");
}
