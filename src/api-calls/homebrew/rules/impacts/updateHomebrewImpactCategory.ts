import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_IMPACTS_TABLE } from "./_getRef";
import { HomebrewImpactCategoryDocument } from "api-calls/homebrew/rules/impacts/_homebrewImpacts.type";

export const updateHomebrewImpactCategory = createApiFunction<
  {
    impactCategoryId: string;
    impactCategory: Partial<HomebrewImpactCategoryDocument>;
  },
  void
>(async (params) => {
  const { impactCategoryId, impactCategory } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_IMPACTS_TABLE)
    .select("data")
    .eq("id", impactCategoryId)
    .single();

  if (fetchError) throw fetchError;

  const updatedData = { ...(existing?.data as unknown as object ?? {}), ...impactCategory };

  const { error } = await supabase
    .from(HOMEBREW_IMPACTS_TABLE)
    .update({ data: updatedData as unknown as any })
    .eq("id", impactCategoryId);

  if (error) throw error;
}, "Failed to update condition meter.");
