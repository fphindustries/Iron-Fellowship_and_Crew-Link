import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_ASSET_COLLECTIONS_TABLE } from "./_getRef";
import { HomebrewAssetCollectionDocument } from "api-calls/homebrew/assets/collections/_homebrewAssetCollection.type";

export const updateHomebrewAssetCollection = createApiFunction<
  {
    assetCollectionId: string;
    assetCollection: Partial<HomebrewAssetCollectionDocument>;
  },
  void
>(async (params) => {
  const { assetCollectionId, assetCollection } = params;

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_ASSET_COLLECTIONS_TABLE)
    .select("data")
    .eq("id", assetCollectionId)
    .single();

  if (fetchError) throw fetchError;

  const updatedData = { ...(existing?.data as object ?? {}), ...assetCollection };

  const { error } = await supabase
    .from(HOMEBREW_ASSET_COLLECTIONS_TABLE)
    .update({ data: updatedData })
    .eq("id", assetCollectionId);

  if (error) throw error;
}, "Failed to update asset collection.");
