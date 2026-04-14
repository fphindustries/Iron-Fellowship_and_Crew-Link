import { supabase } from "config/supabase.config";
import { Track } from "types/Track.type";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateProgressTrack = createApiFunction<
  {
    campaignId?: string;
    characterId?: string;
    trackId: string;
    track: Partial<Track>;
  },
  void
>((params) => {
  const { campaignId, characterId, trackId, track } = params;
  return new Promise((resolve, reject) => {
    if (!campaignId && !characterId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const table = campaignId ? "campaign_tracks" : "character_tracks";

    supabase
      .from(table as any)
      .update(track as Record<string, unknown> as any)
      .eq("id", trackId)
      .then(({ error }: { error: unknown }) => {
        if (error) {
          console.error(error);
          reject("Failed to update progress track");
        } else {
          resolve();
        }
      });
  });
}, "Failed to update progress track.");
