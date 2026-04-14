import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const removeAsset = createApiFunction<
  {
    characterId?: string;
    campaignId?: string;
    assetId: string;
  },
  void
>((params) => {
  const { characterId, campaignId, assetId } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject(new Error("Either character or campaign ID must be defined"));
      return;
    }

    const table = characterId ? "character_assets" : "campaign_assets";

    supabase
      .from(table as any)
      .delete()
      .eq("id", assetId)
      .then(({ error }: { error: unknown }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
  });
}, "Error removing asset");
