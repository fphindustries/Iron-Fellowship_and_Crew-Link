import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { BackstoryRequest, BackstoryOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateCharacterBackstory = createApiFunction<
  BackstoryRequest,
  BackstoryOutput
>(
  async (params) => {
    recordAiCall("generateCharacterBackstory", params);
    const { data, error } = await supabase.functions.invoke<BackstoryOutput>(
      "generate-character-backstory",
      { body: params }
    );
    if (error) throw error;
    return data as BackstoryOutput;
  },
  "Failed to generate backstory. Please try again."
);
