import { supabase } from "config/supabase.config";
import { CombatDocument } from "types/combat.types";

export async function updateCombat(
  combatId: string,
  _characterId: string,
  patch: Partial<Omit<CombatDocument, "id" | "characterId" | "createdAt">>,
  _campaignId?: string
): Promise<void> {
  const dbPatch: {
    objective?: string;
    enemies?: string[];
    position?: string;
    ended?: boolean;
    updated_at?: string;
  } = { updated_at: new Date().toISOString() };

  if (patch.objective !== undefined) dbPatch.objective = patch.objective;
  if (patch.position !== undefined) dbPatch.position = patch.position;
  if (patch.active !== undefined) dbPatch.ended = !patch.active;
  if (patch.enemies !== undefined) dbPatch.enemies = patch.enemies.map((e) => e.name);

  const { error } = await supabase
    .from("combats")
    .update(dbPatch)
    .eq("id", combatId);

  if (error) throw error;
}
