import { supabase } from "config/supabase.config";
import { CampaignDocument } from "api-calls/campaign/_campaign.type";
import { CAMPAIGN_MEMBERS_TABLE, CAMPAIGN_CHARACTERS_TABLE } from "./_getRef";
import { removeCharacterFromCampaign } from "./removeCharacterFromCampaign";
import { createApiFunction } from "api-calls/createApiFunction";

export const leaveCampaign = createApiFunction<
  { uid: string; campaignId: string; campaign: CampaignDocument },
  void
>(async (params) => {
  const { uid, campaignId } = params;

  // Look up this user's characters in the campaign
  const { data: campaignCharacters, error: charError } = await supabase
    .from(CAMPAIGN_CHARACTERS_TABLE)
    .select("character_id, characters!inner(uid)")
    .eq("campaign_id", campaignId)
    .eq("characters.uid", uid);

  if (charError) throw charError;

  // Remove each character belonging to this user from the campaign
  const characterPromises = (campaignCharacters ?? []).map(
    (row: { character_id: string }) =>
      removeCharacterFromCampaign({
        uid,
        campaignId,
        characterId: row.character_id,
      })
  );

  await Promise.all(characterPromises);

  // Remove the user from campaign_members (covers both GM and regular member)
  const { error: memberError } = await supabase
    .from(CAMPAIGN_MEMBERS_TABLE)
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", uid);

  if (memberError) throw memberError;
}, "Failed to remove user from campaign.");
