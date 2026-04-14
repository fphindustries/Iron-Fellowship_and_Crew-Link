import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_STATS_TABLE } from "./_getRef";

export const deleteHomebrewStat = createApiFunction<
  {
    statId: string;
  },
  void
>(async (params) => {
  const { statId } = params;
  const { error } = await supabase
    .from(HOMEBREW_STATS_TABLE)
    .delete()
    .eq("id", statId);
  if (error) throw error;
}, "Failed to delete stat.");
