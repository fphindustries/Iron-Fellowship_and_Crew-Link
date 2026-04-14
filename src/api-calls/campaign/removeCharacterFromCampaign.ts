import { supabase } from "config/supabase.config";
import { CHARACTER_TABLE } from "../character/_getRef";
import { CAMPAIGN_CHARACTERS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const removeCharacterFromCampaign = createApiFunction<
  { uid: string; campaignId: string; characterId: string },
  void
>(async (params) => {
  const { campaignId, characterId } = params;

  const removeFromJoinTable = supabase
    .from(CAMPAIGN_CHARACTERS_TABLE)
    .delete()
    .eq("campaign_id", campaignId)
    .eq("character_id", characterId);

  const clearCharacterCampaign = supabase
    .from(CHARACTER_TABLE)
    .update({ campaign_id: null } as any)
    .eq("id", characterId);

  const [joinResult, characterResult] = await Promise.all([
    removeFromJoinTable,
    clearCharacterCampaign,
  ]);

  if (joinResult.error) throw joinResult.error;
  if (characterResult.error) throw characterResult.error;
}, "Failed to remove character from campaign");
