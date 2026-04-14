import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { HOMEBREW_ASSETS_TABLE } from "./_getRef";
import { HomebrewAssetDocument } from "api-calls/homebrew/assets/assets/_homebrewAssets.type";

export const updateHomebrewAsset = createApiFunction<
  {
    assetId: string;
    asset: Partial<HomebrewAssetDocument>;
  },
  void
>(async (params) => {
  const { assetId, asset } = params;

  const updates: Record<string, unknown> = {};

  if (asset.categoryKey !== undefined) {
    updates.asset_collection_id = asset.categoryKey;
  }

  const { data: existing, error: fetchError } = await supabase
    .from(HOMEBREW_ASSETS_TABLE)
    .select("data")
    .eq("id", assetId)
    .single();

  if (fetchError) throw fetchError;

  updates.data = { ...(existing?.data as object ?? {}), ...asset };

  const { error } = await supabase
    .from(HOMEBREW_ASSETS_TABLE)
    .update(updates as any)
    .eq("id", assetId);

  if (error) throw error;
}, "Failed to update asset.");
