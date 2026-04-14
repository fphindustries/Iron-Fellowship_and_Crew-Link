import { supabase } from "config/supabase.config";
import { CampaignDocument } from "api-calls/campaign/_campaign.type";
import { CAMPAIGN_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const getCampaign = createApiFunction<string, CampaignDocument>(
  async (campaignId) => {
    const { data, error } = await supabase
      .from(CAMPAIGN_TABLE)
      .select("*")
      .eq("id", campaignId)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Could not find campaign");

    return data as unknown as CampaignDocument;
  },
  "Failed to load campaign."
);
