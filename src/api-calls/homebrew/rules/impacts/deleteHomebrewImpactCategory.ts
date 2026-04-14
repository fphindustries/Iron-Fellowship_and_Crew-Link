import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_IMPACTS_TABLE } from "./_getRef";

export const deleteHomebrewImpactCategory = createApiFunction<
  {
    impactCategoryId: string;
  },
  void
>(async (params) => {
  const { impactCategoryId } = params;
  const { error } = await supabase
    .from(HOMEBREW_IMPACTS_TABLE)
    .delete()
    .eq("id", impactCategoryId);
  if (error) throw error;
}, "Failed to delete impact category.");
