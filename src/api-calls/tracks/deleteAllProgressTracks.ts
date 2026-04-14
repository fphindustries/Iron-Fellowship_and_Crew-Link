import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const deleteAllProgressTracks = createApiFunction<
  { characterId?: string; campaignId?: string },
  void
>(({ campaignId, characterId }) => {
  return new Promise<void>((resolve, reject) => {
    if (!campaignId && !characterId) {
      reject("Either campaign or character ID must be defined.");
      return;
    }

    const table = campaignId ? "campaign_tracks" : "character_tracks";
    const column = campaignId ? "campaign_id" : "character_id";
    const id = (campaignId ?? characterId) as string;

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
}, "Failed to delete some or all tracks.");
