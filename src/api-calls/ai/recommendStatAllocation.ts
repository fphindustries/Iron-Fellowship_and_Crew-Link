import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { StatAllocationRequest, StatAllocationOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const recommendStatAllocation = createApiFunction<
  StatAllocationRequest,
  StatAllocationOutput
>(
  async (params) => {
    recordAiCall("recommendStatAllocation", params);
    const { data, error } = await supabase.functions.invoke<StatAllocationOutput>(
      "recommend-stat-allocation",
      { body: params }
    );
    if (error) throw error;
    return data as StatAllocationOutput;
  },
  "Failed to get stat recommendations. Please try again."
);
