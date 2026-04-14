import { supabase } from "config/supabase.config";
import { CAMPAIGN_MEMBERS_TABLE } from "./_getRef";
import { WORLD_TABLE } from "api-calls/world/_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateCampaignGM = createApiFunction<
  {
    campaignId: string;
    worldId?: string;
    gmId: string;
    shouldRemove?: boolean;
  },
  void
>(async (params) => {
  const { campaignId, worldId, gmId, shouldRemove } = params;

  // If adding a GM and there's a world, grant them world ownership
  if (!shouldRemove && worldId) {
    const { data: world, error: fetchError } = await supabase
      .from(WORLD_TABLE)
      .select("owner_ids")
      .eq("id", worldId)
      .single();

    if (fetchError) throw fetchError;

    const ownerIds = world.owner_ids ?? [];
    if (!ownerIds.includes(gmId)) {
      const { error: worldError } = await supabase
        .from(WORLD_TABLE)
        .update({ owner_ids: [...ownerIds, gmId] })
        .eq("id", worldId);

      if (worldError) throw worldError;
    }
  }

  if (shouldRemove) {
    const { error } = await supabase
      .from(CAMPAIGN_MEMBERS_TABLE)
      .update({ is_gm: false })
      .eq("campaign_id", campaignId)
      .eq("user_id", gmId);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from(CAMPAIGN_MEMBERS_TABLE)
      .update({ is_gm: true })
      .eq("campaign_id", campaignId)
      .eq("user_id", gmId);

    if (error) throw error;
  }
}, "Failed to update GM.");
