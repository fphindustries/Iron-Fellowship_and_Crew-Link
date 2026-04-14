import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_ASSET_COLLECTIONS_TABLE } from "./_getRef";

export const deleteHomebrewAssetCollection = createApiFunction<
  {
    assetCollectionId: string;
  },
  void
>(async (params) => {
  const { assetCollectionId } = params;
  const { error } = await supabase
    .from(HOMEBREW_ASSET_COLLECTIONS_TABLE)
    .delete()
    .eq("id", assetCollectionId);
  if (error) throw error;
}, "Failed to delete asset collection.");
