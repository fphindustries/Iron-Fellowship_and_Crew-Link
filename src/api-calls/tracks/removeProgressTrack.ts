import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";

export const removeProgressTrack = createApiFunction<
  {
    campaignId?: string;
    characterId?: string;
    id: string;
  },
  void
>((params) => {
  const { campaignId, characterId, id } = params;

  return new Promise((resolve, reject) => {
    if (!campaignId && !characterId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const table = campaignId ? "campaign_tracks" : "character_tracks";

    supabase
      .from(table as any)
      .delete()
      .eq("id", id)
      .then(({ error }: { error: unknown }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
  });
}, "Failed to remove progress track.");
