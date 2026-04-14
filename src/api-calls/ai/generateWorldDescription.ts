import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { WorldDescriptionRequest, WorldDescriptionOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateWorldDescription = createApiFunction<
  WorldDescriptionRequest,
  WorldDescriptionOutput
>(
  async (params) => {
    recordAiCall("generateWorldDescription", params);
    const { data, error } = await supabase.functions.invoke<WorldDescriptionOutput>(
      "generate-world-description",
      { body: params }
    );
    if (error) throw error;
    return data as WorldDescriptionOutput;
  },
  "Failed to generate world description. Please try again."
);
