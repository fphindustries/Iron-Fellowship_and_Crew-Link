import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_CONDITION_METERS_TABLE } from "./_getRef";

export const deleteHomebrewConditionMeter = createApiFunction<
  {
    conditionMeterId: string;
  },
  void
>(async (params) => {
  const { conditionMeterId } = params;
  const { error } = await supabase
    .from(HOMEBREW_CONDITION_METERS_TABLE)
    .delete()
    .eq("id", conditionMeterId);
  if (error) throw error;
}, "Failed to delete condition meter.");
