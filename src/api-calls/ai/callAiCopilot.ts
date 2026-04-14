import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { AiGuideRequest, AiGuideResponse } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const callAiGuide = createApiFunction<AiGuideRequest, AiGuideResponse>(
  async (params) => {
    recordAiCall("callAiGuide", params);
    const { data, error } = await supabase.functions.invoke<AiGuideResponse>(
      "call-ai-guide",
      { body: params }
    );
    if (error) throw error;
    return data as AiGuideResponse;
  },
  "Failed to get AI suggestion. Please try again."
);
