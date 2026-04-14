import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_NON_LINEAR_METERS_TABLE } from "./_getRef";
import { HomebrewNonLinearMeterDocument } from "api-calls/homebrew/rules/nonLinearMeters/_homebrewNonLinearMeter.type";

export const createHomebrewNonLinearMeter = createApiFunction<
  {
    meter: HomebrewNonLinearMeterDocument;
  },
  void
>(async (params) => {
  const { meter } = params;
  const { error } = await supabase.from(HOMEBREW_NON_LINEAR_METERS_TABLE).insert({
    collection_id: meter.collectionId,
    data: meter,
  } as any);
  if (error) throw error;
}, "Failed to create meter.");
