import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { VowRequest, VowOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateCharacterVow = createApiFunction<VowRequest, VowOutput>(
  async (params) => {
    recordAiCall("generateCharacterVow", params);
    const { data, error } = await supabase.functions.invoke<VowOutput>(
      "generate-character-vow",
      { body: params }
    );
    if (error) throw error;
    return data as VowOutput;
  },
  "Failed to generate vow. Please try again."
);
