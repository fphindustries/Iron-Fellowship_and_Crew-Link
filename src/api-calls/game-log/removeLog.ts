import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";

export const removeLog = createApiFunction<
  { campaignId?: string; characterId?: string; logId: string },
  void
>((params) => {
  const { campaignId, characterId, logId } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const query = campaignId
      ? supabase.from("campaign_game_log").delete().eq("id", logId)
      : supabase.from("character_game_log").delete().eq("id", logId);

    Promise.resolve(query).then(({ error }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}, "Failed to delete roll.");
