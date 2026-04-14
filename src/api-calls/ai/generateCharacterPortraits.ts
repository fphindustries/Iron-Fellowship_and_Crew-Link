import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { PortraitGenerationRequest, PortraitGenerationOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateCharacterPortraits = createApiFunction<
  PortraitGenerationRequest,
  PortraitGenerationOutput
>(
  async (params) => {
    recordAiCall("generateCharacterPortraits", params);
    const { data, error } = await supabase.functions.invoke<PortraitGenerationOutput>(
      "generate-character-portraits",
      { body: params }
    );
    if (error) throw error;
    return data as PortraitGenerationOutput;
  },
  "Failed to generate character portraits. Please try again."
);
