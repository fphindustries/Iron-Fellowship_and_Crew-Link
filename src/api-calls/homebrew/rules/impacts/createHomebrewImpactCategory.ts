import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_IMPACTS_TABLE } from "./_getRef";
import { HomebrewImpactCategoryDocument } from "api-calls/homebrew/rules/impacts/_homebrewImpacts.type";

export const createHomebrewImpactCategory = createApiFunction<
  {
    impactCategory: HomebrewImpactCategoryDocument;
  },
  void
>(async (params) => {
  const { impactCategory } = params;
  const { error } = await supabase.from(HOMEBREW_IMPACTS_TABLE).insert({
    collection_id: impactCategory.collectionId,
    data: impactCategory,
  } as any);
  if (error) throw error;
}, "Failed to create impact category.");
