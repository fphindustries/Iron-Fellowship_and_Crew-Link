import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { SectorGenerationRequest, SectorGenerationOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const generateSectorContent = createApiFunction<
  SectorGenerationRequest,
  SectorGenerationOutput
>(
  async (params) => {
    recordAiCall("generateSectorContent", params);
    const { data, error } = await supabase.functions.invoke<SectorGenerationOutput>(
      "generate-sector-content",
      { body: params }
    );
    if (error) throw error;
    return data as SectorGenerationOutput;
  },
  "Failed to generate sector content. Please try again."
);
