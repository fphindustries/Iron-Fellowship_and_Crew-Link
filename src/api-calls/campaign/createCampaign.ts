import { supabase } from "config/supabase.config";
import { CampaignType } from "../../api-calls/campaign/_campaign.type";
import { CAMPAIGN_TABLE, CAMPAIGN_MEMBERS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const createCampaign = createApiFunction<
  { uid: string; campaignName: string; campaignType: CampaignType },
  string
>(async (params) => {
  const { uid, campaignName, campaignType } = params;

  const { data, error } = await supabase
    .from(CAMPAIGN_TABLE)
    .insert({ name: campaignName, game_system: campaignType })
    .select()
    .single();

  if (error) throw error;

  const campaignId = data.id;

  // Add the creator as a member; for co-op mode they are also a GM
  const isGm = campaignType === CampaignType.Coop;
  const { error: memberError } = await supabase
    .from(CAMPAIGN_MEMBERS_TABLE)
    .insert({ campaign_id: campaignId, user_id: uid, is_gm: isGm });

  if (memberError) throw memberError;

  return campaignId;
}, "Error creating campaign.");
