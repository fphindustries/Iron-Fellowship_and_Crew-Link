import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { LOCATIONS_TABLE } from "./_getRef";

export const updateLocationCharacterBond = createApiFunction<
  {
    worldId: string;
    locationId: string;
    characterId: string;
    bonded: boolean;
  },
  void
>(async (params) => {
  const { locationId, characterId, bonded } = params;

  // Fetch current data to merge characterBonds
  const { data, error: fetchError } = await supabase
    .from(LOCATIONS_TABLE)
    .select("data")
    .eq("id", locationId)
    .single();

  if (fetchError) throw fetchError;

  const currentData = (data?.data as Record<string, unknown>) ?? {};
  const currentBonds = (currentData.characterBonds as Record<string, boolean>) ?? {};
  const updatedBonds = { ...currentBonds, [characterId]: bonded };

  const { error } = await supabase
    .from(LOCATIONS_TABLE)
    .update({
      data: { ...currentData, characterBonds: updatedBonds },
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId);

  if (error) throw error;
}, "Error updating location bonds.");
