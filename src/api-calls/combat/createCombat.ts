import { supabase } from "config/supabase.config";
import { CombatEnemy, CombatPosition } from "types/combat.types";
import { Difficulty } from "types/Track.type";

export async function createCombat(params: {
  characterId: string;
  campaignId?: string;
  sessionId: string;
  objective: string;
  enemies: CombatEnemy[];
  position: CombatPosition;
  difficulty: Difficulty;
  trackId?: string;
}): Promise<string> {
  const { campaignId, sessionId, objective, enemies, position } = params;

  const { data: inserted, error } = await supabase
    .from("combats")
    .insert({
      session_id: sessionId,
      campaign_id: campaignId ?? "",
      objective,
      enemies: enemies.map((e) => e.name),
      position,
      ended: false,
    })
    .select()
    .single();

  if (error) throw error;
  return inserted.id;
}
