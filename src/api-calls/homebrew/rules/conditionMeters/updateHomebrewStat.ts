import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_CONDITION_METERS_TABLE } from "./_getRef";
import { HomebrewConditionMeterDocument } from "api-calls/homebrew/rules/conditionMeters/_homebrewConditionMeters.type";

export const updateHomebrewConditionMeter = createApiFunction<
  {
    conditionMeterId: string;
    conditionMeter: Partial<HomebrewConditionMeterDocument>;
  },
  void
>(async (params) => {
  const { conditionMeterId, conditionMeter } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_CONDITION_METERS_TABLE)
    .select("data")
    .eq("id", conditionMeterId)
    .single();

  if (fetchError) throw fetchError;

  const updatedData = { ...(existing?.data as object ?? {}), ...conditionMeter };

  const { error } = await supabase
    .from(HOMEBREW_CONDITION_METERS_TABLE)
    .update({ data: updatedData })
    .eq("id", conditionMeterId);

  if (error) throw error;
}, "Failed to update condition meter.");
