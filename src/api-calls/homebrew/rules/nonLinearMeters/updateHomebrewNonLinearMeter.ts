import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_NON_LINEAR_METERS_TABLE } from "./_getRef";
import { HomebrewNonLinearMeterDocument } from "api-calls/homebrew/rules/nonLinearMeters/_homebrewNonLinearMeter.type";

export const updateHomebrewNonLinearMeter = createApiFunction<
  {
    meterId: string;
    meter: Partial<HomebrewNonLinearMeterDocument>;
  },
  void
>(async (params) => {
  const { meterId, meter } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_NON_LINEAR_METERS_TABLE)
    .select("data")
    .eq("id", meterId)
    .single();

  if (fetchError) throw fetchError;

  const updatedData = { ...(existing?.data as object ?? {}), ...meter };

  const { error } = await supabase
    .from(HOMEBREW_NON_LINEAR_METERS_TABLE)
    .update({ data: updatedData })
    .eq("id", meterId);

  if (error) throw error;
}, "Failed to update meter.");
