import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";

export const deleteAllLogs = createApiFunction<
  { characterId?: string; campaignId?: string },
  void
>(({ campaignId, characterId }) => {
  return new Promise<void>((resolve, reject) => {
    if (!campaignId && !characterId) {
      reject("Either campaign or character ID must be defined.");
      return;
    }

    const query = characterId
      ? supabase.from("character_game_log").delete().eq("character_id", characterId)
      : supabase.from("campaign_game_log").delete().eq("campaign_id", campaignId as string);

    Promise.resolve(query).then(({ error }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}, "Failed to delete some or all logs.");
