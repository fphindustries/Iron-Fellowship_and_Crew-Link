import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { World } from "api-calls/world/_world.type";
import { WORLD_TABLE } from "./_getRef";

export const updateWorld = createApiFunction<
  { worldId: string; partialWorld: Partial<World> },
  void
>(async (params) => {
  const { worldId, partialWorld } = params;

  const { settingKey, ownerIds, campaignGuides, newTruths, worldDescription, name } =
    partialWorld;

  // Map World fields to Supabase column names
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (settingKey !== undefined) updates.setting_key = settingKey;
  if (ownerIds !== undefined) updates.owner_ids = ownerIds;
  if (campaignGuides !== undefined) updates.campaign_guides = campaignGuides;
  if (newTruths !== undefined) updates.new_truths = newTruths;
  if (worldDescription !== undefined) {
    updates.description = btoa(String.fromCharCode(...worldDescription));
  }

  const { error } = await supabase
    .from(WORLD_TABLE)
    .update(updates as any)
    .eq("id", worldId);

  if (error) throw error;
}, "Failed to update world.");
