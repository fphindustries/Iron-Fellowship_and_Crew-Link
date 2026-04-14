import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { Roll } from "types/DieRolls.type";
import { convertRollToUpdateData } from "./_getRef";

export const updateLog = createApiFunction<
  { campaignId?: string; characterId?: string; logId: string; log: Roll },
  void
>((params) => {
  const { campaignId, characterId, logId, log } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const updateData = convertRollToUpdateData(log);

    const query = campaignId
      ? supabase.from("campaign_game_log").update(updateData as never).eq("id", logId)
      : supabase.from("character_game_log").update(updateData as never).eq("id", logId);

    Promise.resolve(query).then(({ error }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}, "Failed to update roll.");
