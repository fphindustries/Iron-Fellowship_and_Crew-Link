import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HomebrewAssetCollectionDocument } from "api-calls/homebrew/assets/collections/_homebrewAssetCollection.type";
import { HOMEBREW_ASSET_COLLECTIONS_TABLE } from "./_getRef";

export const createHomebrewAssetCollection = createApiFunction<
  { assetCollection: HomebrewAssetCollectionDocument },
  void
>(async (params) => {
  const { assetCollection } = params;
  const { error } = await supabase.from(HOMEBREW_ASSET_COLLECTIONS_TABLE).insert({
    collection_id: assetCollection.collectionId,
    data: assetCollection,
  } as any);
  if (error) throw error;
}, "Failed to create asset collection.");
