import { supabase } from "config/supabase.config";
import { CAMPAIGN_MEMBERS_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const addUserToCampaign = createApiFunction<
  { campaignId: string; userId: string },
  void
>(async (params) => {
  const { campaignId, userId } = params;

  const { error } = await supabase
    .from(CAMPAIGN_MEMBERS_TABLE)
    .insert({ campaign_id: campaignId, user_id: userId, is_gm: false });

  if (error) throw error;
}, "Error adding user to campaign.");
