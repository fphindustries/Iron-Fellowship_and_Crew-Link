import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { RandomizeAppearanceRequest, RandomizeAppearanceOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const randomizeCharacterAppearance = createApiFunction<
  RandomizeAppearanceRequest,
  RandomizeAppearanceOutput
>(
  async (params) => {
    recordAiCall("randomizeCharacterAppearance", params);
    const { data, error } = await supabase.functions.invoke<RandomizeAppearanceOutput>(
      "randomize-character-appearance",
      { body: params }
    );
    if (error) throw error;
    return data as RandomizeAppearanceOutput;
  },
  "Failed to generate appearance suggestions. Please try again."
);
