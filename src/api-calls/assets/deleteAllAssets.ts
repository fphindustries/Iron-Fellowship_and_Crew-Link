import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const deleteAllAssets = createApiFunction<
  { characterId?: string; campaignId?: string },
  void
>(({ campaignId, characterId }) => {
  return new Promise<void>((resolve, reject) => {
    if (!campaignId && !characterId) {
      reject("Either campaign or character ID must be defined.");
      return;
    }

    const table = characterId ? "character_assets" : "campaign_assets";
    const column = characterId ? "character_id" : "campaign_id";
    const id = (characterId ?? campaignId) as string;

    supabase
      .from(table as any)
      .delete()
      .eq(column, id)
      .then(({ error }: { error: unknown }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
  });
}, "Failed to delete some or all assets.");
