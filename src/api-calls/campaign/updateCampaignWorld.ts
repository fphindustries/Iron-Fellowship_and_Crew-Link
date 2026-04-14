import { supabase } from "config/supabase.config";
import { CAMPAIGN_TABLE } from "./_getRef";
import { WORLD_TABLE } from "api-calls/world/_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateCampaignWorld = createApiFunction<
  { campaignId: string; gmIds: string[]; worldId?: string },
  void
>(async (params) => {
  const { campaignId, gmIds, worldId } = params;

  if (worldId) {
    // Grant all GMs ownership of the world
    const { data: world, error: fetchError } = await supabase
      .from(WORLD_TABLE)
      .select("owner_ids")
      .eq("id", worldId)
      .single();

    if (fetchError) throw fetchError;

    const existingOwners = world.owner_ids ?? [];
    const merged = Array.from(new Set([...existingOwners, ...gmIds]));
    const { error: worldError } = await supabase
      .from(WORLD_TABLE)
      .update({ owner_ids: merged })
      .eq("id", worldId);

    if (worldError) throw worldError;

    const { error } = await supabase
      .from(CAMPAIGN_TABLE)
      .update({ world_id: worldId })
      .eq("id", campaignId);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from(CAMPAIGN_TABLE)
      .update({ world_id: null })
      .eq("id", campaignId);

    if (error) throw error;
  }
}, "Failed to update campaign world.");
