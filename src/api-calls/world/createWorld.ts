import { supabase } from "config/supabase.config";
import { World } from "api-calls/world/_world.type";
import { createApiFunction } from "api-calls/createApiFunction";
import { WORLD_TABLE, encodeWorldDescription } from "./_getRef";

export const createWorld = createApiFunction<World, string>(async (world) => {
  const { worldDescription, ownerIds, campaignGuides, newTruths, settingKey, name } = world;

  const { data, error } = await supabase
    .from(WORLD_TABLE)
    .insert({
      name,
      setting_key: settingKey,
      owner_ids: ownerIds,
      campaign_guides: campaignGuides ?? undefined,
      new_truths: (newTruths as any) ?? undefined,
      description: worldDescription ? encodeWorldDescription(worldDescription) : null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}, "Failed to create world");
