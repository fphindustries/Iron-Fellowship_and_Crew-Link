import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { AssetDocument } from "api-calls/assets/_asset.type";

interface AssetRow {
  data: AssetDocument | null;
}

export const updateAssetCheckbox = createApiFunction<
  {
    characterId?: string;
    campaignId?: string;
    assetId: string;
    abilityIndex: number;
    checked: boolean;
  },
  void
>((params) => {
  const { characterId, campaignId, assetId, abilityIndex, checked } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject("Either campaign or character ID must be defined.");
      return;
    }

    const table = characterId ? "character_assets" : "campaign_assets";

    // Fetch current data, then patch enabledAbilities, then update
    (supabase as any).from(table)
      .select("data")
      .eq("id", assetId)
      .single()
      .then(
        ({
          data: row,
          error: fetchError,
        }: {
          data: AssetRow | null;
          error: unknown;
        }) => {
          if (fetchError || !row) {
            reject(fetchError ?? new Error("Asset not found"));
            return;
          }
          const currentData = (row.data ?? {}) as AssetDocument;
          const enabledAbilities: Record<number, boolean> = {
            ...(currentData.enabledAbilities ?? {}),
            [abilityIndex]: checked,
          };
          const updatedData: AssetDocument = { ...currentData, enabledAbilities };

          (supabase as any).from(table)
            .update({ data: updatedData })
            .eq("id", assetId)
            .then(({ error }: { error: unknown }) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
        }
      );
  });
}, "Error updating asset ability.");
