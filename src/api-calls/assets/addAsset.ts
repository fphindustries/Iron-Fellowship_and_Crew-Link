import { supabase } from "config/supabase.config";
import { AssetDocument } from "api-calls/assets/_asset.type";
import { createApiFunction } from "api-calls/createApiFunction";

interface AddAssetParams {
  campaignId?: string;
  characterId?: string;
  asset: AssetDocument;
}

export const addAsset = createApiFunction<AddAssetParams, void>((params) => {
  const { characterId, campaignId, asset } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject("Either character or campaign ID must be defined.");
      return;
    }

    const table = characterId ? "character_assets" : "campaign_assets";
    const foreignKey = characterId
      ? { character_id: characterId }
      : { campaign_id: campaignId };

    supabase
      .from(table as any)
      .insert({ ...foreignKey, data: asset, order: asset.order })
      .then(({ error }: { error: unknown }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
  });
}, "Error creating your asset");
