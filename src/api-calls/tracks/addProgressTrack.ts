import { supabase } from "config/supabase.config";
import { convertToRow } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { Track } from "types/Track.type";

export const addProgressTrack = createApiFunction<
  {
    campaignId?: string;
    characterId?: string;
    track: Track;
  },
  void
>((params) => {
  const { campaignId, characterId, track } = params;

  const row = convertToRow(track);

  return new Promise((resolve, reject) => {
    if (!campaignId && !characterId) {
      reject("Must provide either a character or a campaign ID");
      return;
    }

    const table = campaignId ? "campaign_tracks" : "character_tracks";
    const foreignKey = campaignId
      ? { campaign_id: campaignId }
      : { character_id: characterId };

    supabase
      .from(table as any)
      .insert({ ...foreignKey, ...row })
      .then(({ error }: { error: unknown }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
  });
}, "Failed to add progress track.");
