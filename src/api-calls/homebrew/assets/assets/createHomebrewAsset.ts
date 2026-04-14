import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_ASSETS_TABLE } from "./_getRef";
import { HomebrewAssetDocument } from "api-calls/homebrew/assets/assets/_homebrewAssets.type";

export const createHomebrewAsset = createApiFunction<
  { asset: HomebrewAssetDocument },
  void
>(async (params) => {
  const { asset } = params;
  const { error } = await supabase.from(HOMEBREW_ASSETS_TABLE).insert({
    collection_id: asset.collectionId,
    asset_collection_id: asset.categoryKey,
    data: asset,
  } as any);
  if (error) throw error;
}, "Failed to create asset.");
