import { supabase } from "config/supabase.config";
import { CAMPAIGN_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { CampaignDocument } from "api-calls/campaign/_campaign.type";

export const updateCampaign = createApiFunction<
  {
    campaignId: string;
    campaign: Partial<CampaignDocument>;
  },
  void
>(async (params) => {
  const { campaignId, campaign } = params;

  const { error } = await supabase
    .from(CAMPAIGN_TABLE)
    .update(campaign as any)
    .eq("id", campaignId);

  if (error) throw error;
}, "Failed to update campaign.");
