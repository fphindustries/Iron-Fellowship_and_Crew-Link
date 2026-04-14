import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_IMPACTS_TABLE } from "./_getRef";
import { HomebrewImpactCategoryDocument } from "api-calls/homebrew/rules/impacts/_homebrewImpacts.type";

export const deleteHomebrewImpact = createApiFunction<
  {
    impactCategoryId: string;
    impactId: string;
  },
  void
>(async (params) => {
  const { impactCategoryId, impactId } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_IMPACTS_TABLE)
    .select("data")
    .eq("id", impactCategoryId)
    .single();

  if (fetchError) throw fetchError;

  const currentData = (existing?.data as unknown as HomebrewImpactCategoryDocument) ?? {};
  const updatedContents = { ...(currentData.contents ?? {}) };
  delete updatedContents[impactId];

  const { error } = await supabase
    .from(HOMEBREW_IMPACTS_TABLE)
    .update({ data: { ...currentData, contents: updatedContents } as any })
    .eq("id", impactCategoryId);

  if (error) throw error;
}, "Failed to delete impact.");
