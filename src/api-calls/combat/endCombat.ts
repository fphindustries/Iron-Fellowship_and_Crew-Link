import { supabase } from "config/supabase.config";

export async function endCombat(
  combatId: string,
  _characterId: string,
  _campaignId?: string
): Promise<void> {
  const { error } = await supabase
    .from("combats")
    .update({ ended: true, updated_at: new Date().toISOString() })
    .eq("id", combatId);

  if (error) throw error;
}
