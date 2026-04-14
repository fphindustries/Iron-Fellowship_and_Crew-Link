import { supabase } from "config/supabase.config";
import { WORLD_TABLE } from "./_getRef";
import { createApiFunction } from "api-calls/createApiFunction";
import { Truth } from "api-calls/world/_world.type";

export const updateWorldTruth = createApiFunction<
  { worldId: string; truthKey: string; truth: Truth },
  void
>(async (params) => {
  const { worldId, truthKey, truth } = params;

  // Fetch current newTruths
  const { data, error: fetchError } = await supabase
    .from(WORLD_TABLE)
    .select("new_truths")
    .eq("id", worldId)
    .single();

  if (fetchError) throw fetchError;

  const currentTruths: Record<string, unknown> = (data?.new_truths ?? {}) as Record<string, unknown>;
  const updatedTruths = { ...currentTruths, [truthKey]: truth };

  const { error } = await supabase
    .from(WORLD_TABLE)
    .update({ new_truths: updatedTruths as any })
    .eq("id", worldId);

  if (error) throw error;
}, "Failed to update world truth.");
