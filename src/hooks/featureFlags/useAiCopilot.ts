import { useFeatureFlag } from "./useFeatureFlag";

export function useAiGuide(): boolean {
  return useFeatureFlag("ai-guide");
}
