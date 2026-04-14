import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { CharacterSummaryRequest, CharacterSummaryOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateCharacterSummary = createApiFunction<
  CharacterSummaryRequest,
  CharacterSummaryOutput
>(
  async (params) => {
    recordAiCall("generateCharacterSummary", params);
    const { data, error } = await supabase.functions.invoke<CharacterSummaryOutput>(
      "generate-character-summary",
      { body: params }
    );
    if (error) throw error;
    return data as CharacterSummaryOutput;
  },
  "Failed to generate character summary. Please try again."
);
