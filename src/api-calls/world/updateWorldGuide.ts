import { supabase } from "config/supabase.config";
import { WORLD_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";

export const updateWorldGuide = createApiFunction<
  {
    worldId: string;
    guideId: string;
    shouldRemove?: boolean;
  },
  void
>(async (params) => {
  const { worldId, guideId, shouldRemove } = params;

  // Fetch current campaign_guides
  const { data, error: fetchError } = await supabase
    .from(WORLD_TABLE)
    .select("campaign_guides")
    .eq("id", worldId)
    .single();

  if (fetchError) throw fetchError;

  const currentGuides: string[] = data?.campaign_guides ?? [];
  let updatedGuides: string[];

  if (shouldRemove) {
    updatedGuides = currentGuides.filter((id) => id !== guideId);
  } else {
    updatedGuides = currentGuides.includes(guideId)
      ? currentGuides
      : [...currentGuides, guideId];
  }

  const { error } = await supabase
    .from(WORLD_TABLE)
    .update({ campaign_guides: updatedGuides })
    .eq("id", worldId);

  if (error) throw error;
}, "Failed to update world guides.");
