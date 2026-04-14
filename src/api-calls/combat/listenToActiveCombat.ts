import { supabase } from "config/supabase.config";
import { CombatDocument } from "types/combat.types";
import { CombatRow } from "lib/database.types";
import { Difficulty } from "types/Track.type";

function rowToCombatDocument(row: CombatRow): CombatDocument & { id: string } {
  return {
    id: row.id,
    characterId: "",
    campaignId: row.campaign_id,
    sessionId: row.session_id,
    objective: row.objective,
    enemies: row.enemies.map((name) => ({ name })),
    position: row.position as CombatDocument["position"],
    difficulty: 0 as unknown as Difficulty,
    active: !row.ended,
    createdAt: null as unknown as CombatDocument["createdAt"],
  };
}

function fetchActiveCombat(
  campaignId: string | undefined,
  callback: (combat: (CombatDocument & { id: string }) | null) => void
): void {
  const baseQuery = supabase
    .from("combats")
    .select("*")
    .eq("ended", false)
    .limit(1);

  const query = campaignId
    ? baseQuery.eq("campaign_id", campaignId)
    : baseQuery;

  void query.then(({ data }) => {
    if (!data || data.length === 0) {
      callback(null);
    } else {
      callback(rowToCombatDocument(data[0]));
    }
  });
}

export function listenToActiveCombat(
  characterId: string,
  callback: (combat: (CombatDocument & { id: string }) | null) => void,
  campaignId?: string
): () => void {
  const filterValue = campaignId ?? characterId;
  const filterColumn = campaignId ? "campaign_id" : "session_id";

  const channel = supabase
    .channel(`combats:active:${filterValue}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "combats",
        filter: `${filterColumn}=eq.${filterValue}`,
      },
      () => {
        fetchActiveCombat(campaignId, callback);
      }
    )
    .subscribe();

  // Initial fetch
  fetchActiveCombat(campaignId, callback);

  return () => supabase.removeChannel(channel);
}
