import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_NON_LINEAR_METERS_TABLE } from "./_getRef";

export const deleteHomebrewNonLinearMeter = createApiFunction<
  {
    meterId: string;
  },
  void
>(async (params) => {
  const { meterId } = params;
  const { error } = await supabase
    .from(HOMEBREW_NON_LINEAR_METERS_TABLE)
    .delete()
    .eq("id", meterId);
  if (error) throw error;
}, "Failed to delete non-linear meter.");
