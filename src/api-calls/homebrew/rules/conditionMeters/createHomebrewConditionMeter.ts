import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_CONDITION_METERS_TABLE } from "./_getRef";
import { HomebrewConditionMeterDocument } from "api-calls/homebrew/rules/conditionMeters/_homebrewConditionMeters.type";

export const createHomebrewConditionMeter = createApiFunction<
  {
    conditionMeter: HomebrewConditionMeterDocument;
  },
  void
>(async (params) => {
  const { conditionMeter } = params;
  const { error } = await supabase.from(HOMEBREW_CONDITION_METERS_TABLE).insert({
    collection_id: conditionMeter.collectionId,
    data: conditionMeter,
  } as any);
  if (error) throw error;
}, "Failed to create condition meter.");
