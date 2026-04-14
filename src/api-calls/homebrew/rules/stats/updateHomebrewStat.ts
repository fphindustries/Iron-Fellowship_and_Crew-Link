import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_STATS_TABLE } from "./_getRef";
import { HomebrewStatDocument } from "api-calls/homebrew/rules/stats/_homebrewStat.type";

export const updateHomebrewStat = createApiFunction<
  {
    statId: string;
    stat: Partial<HomebrewStatDocument>;
  },
  void
>(async (params) => {
  const { statId, stat } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_STATS_TABLE)
    .select("data")
    .eq("id", statId)
    .single();

  if (fetchError) throw fetchError;

  const updatedData = { ...(existing?.data as object ?? {}), ...stat };

  const { error } = await supabase
    .from(HOMEBREW_STATS_TABLE)
    .update({ data: updatedData })
    .eq("id", statId);

  if (error) throw error;
}, "Failed to update stat.");
