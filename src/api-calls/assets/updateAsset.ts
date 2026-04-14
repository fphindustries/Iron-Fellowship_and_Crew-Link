import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { AssetDocument } from "api-calls/assets/_asset.type";

export const updateAsset = createApiFunction<
  {
    characterId?: string;
    campaignId?: string;
    assetId: string;
    asset: Partial<AssetDocument>;
  },
  void
>((params) => {
  const { characterId, campaignId, assetId, asset } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject("Either campaign or character ID must be defined.");
      return;
    }

    const table = characterId ? "character_assets" : "campaign_assets";

    supabase
      .from(table as any)
      .update({ data: asset })
      .eq("id", assetId)
      .then(({ error }: { error: unknown }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
  });
}, "Error updating asset.");
