import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_ASSETS_TABLE } from "./_getRef";

export const deleteHomebrewAsset = createApiFunction<
  {
    assetId: string;
  },
  void
>(async (params) => {
  const { assetId } = params;
  const { error } = await supabase
    .from(HOMEBREW_ASSETS_TABLE)
    .delete()
    .eq("id", assetId);
  if (error) throw error;
}, "Failed to delete asset.");
