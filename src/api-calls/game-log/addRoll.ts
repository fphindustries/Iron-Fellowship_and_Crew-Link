import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { Roll } from "types/DieRolls.type";
import { convertRollToInsertData } from "./_getRef";

export const addRoll = createApiFunction<
  { roll: Roll; campaignId?: string; characterId?: string },
  string
>((params) => {
  const { characterId, campaignId, roll } = params;

  return new Promise((resolve, reject) => {
    if (!characterId && !campaignId) {
      reject(new Error("Either campaign or character ID must be defined."));
      return;
    }

    const insertData = convertRollToInsertData(roll, campaignId, characterId);

    const query = campaignId
      ? supabase.from("campaign_game_log").insert(insertData as never).select().single()
      : supabase.from("character_game_log").insert(insertData as never).select().single();

    Promise.resolve(query).then(({ data: inserted, error }) => {
      if (error) {
        reject(error);
      } else {
        resolve((inserted as { id: string }).id);
      }
    });
  });
}, "Failed to add roll to log.");
