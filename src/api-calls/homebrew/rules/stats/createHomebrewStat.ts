import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_STATS_TABLE } from "./_getRef";
import { HomebrewStatDocument } from "api-calls/homebrew/rules/stats/_homebrewStat.type";

export const createHomebrewStat = createApiFunction<
  {
    stat: HomebrewStatDocument;
  },
  void
>(async (params) => {
  const { stat } = params;
  const { error } = await supabase.from(HOMEBREW_STATS_TABLE).insert({
    collection_id: stat.collectionId,
    data: stat,
  } as any);
  if (error) throw error;
}, "Failed to create stat.");
