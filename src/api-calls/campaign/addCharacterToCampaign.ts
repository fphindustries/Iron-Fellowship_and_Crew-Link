import { supabase } from "config/supabase.config";
import { CHARACTER_TABLE } from "../character/_getRef";
import { CAMPAIGN_CHARACTERS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const addCharacterToCampaign = createApiFunction<
  { uid: string; characterId: string; campaignId: string },
  void
>(async (params) => {
  const { uid, characterId, campaignId } = params;

  const addToJoinTable = supabase
    .from(CAMPAIGN_CHARACTERS_TABLE)
    .upsert({ campaign_id: campaignId, character_id: characterId });

  const updateCharacter = supabase
    .from(CHARACTER_TABLE)
    .update({ campaign_id: campaignId } as any)
    .eq("id", characterId)
    .eq("uid", uid);

  const [joinResult, characterResult] = await Promise.all([
    addToJoinTable,
    updateCharacter,
  ]);

  if (joinResult.error) throw joinResult.error;
  if (characterResult.error) throw characterResult.error;
}, "Error adding character to campaign.");
