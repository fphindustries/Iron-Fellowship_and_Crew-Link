import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_IMPACTS_TABLE } from "./_getRef";
import {
  HomebrewImpact,
  HomebrewImpactCategoryDocument,
} from "api-calls/homebrew/rules/impacts/_homebrewImpacts.type";

export const updateHomebrewImpact = createApiFunction<
  {
    impactCategoryId: string;
    impact: HomebrewImpact;
  },
  void
>(async (params) => {
  const { impactCategoryId, impact } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_IMPACTS_TABLE)
    .select("data")
    .eq("id", impactCategoryId)
    .single();

  if (fetchError) throw fetchError;

  const currentData = (existing?.data as unknown as HomebrewImpactCategoryDocument) ?? {};
  const updatedData = {
    ...currentData,
    contents: {
      ...(currentData.contents ?? {}),
      [impact.dataswornId]: impact,
    },
  };

  const { error } = await supabase
    .from(HOMEBREW_IMPACTS_TABLE)
    .update({ data: updatedData as unknown as any })
    .eq("id", impactCategoryId);

  if (error) throw error;
}, "Failed to update impact.");
