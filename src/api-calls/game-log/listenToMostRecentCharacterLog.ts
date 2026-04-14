import { supabase } from "config/supabase.config";
import { Roll } from "types/DieRolls.type";
import { CharacterGameLogRow, CampaignGameLogRow } from "lib/database.types";
import { convertFromDatabase } from "./_getRef";

export function listenToMostRecentCharacterLog(params: {
  isGM: boolean;
  campaignId?: string;
  characterId: string;
  onRoll: (rollId: string, roll: Roll) => void;
  onError: (error: string) => void;
}): () => void {
  const { isGM, campaignId, characterId, onRoll, onError } = params;

  type LogRow = CharacterGameLogRow | CampaignGameLogRow;
  const table = campaignId ? "campaign_game_log" : "character_game_log";
  const parentColumn = campaignId ? "campaign_id" : "character_id";
  const parentValue = (campaignId ?? characterId) as string;

  const channel = supabase
    .channel(`${table}:recent:${characterId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table,
        filter: `${parentColumn}=eq.${parentValue}`,
      },
      (payload) => {
        const row = payload.new as LogRow;
        if (row.character_id !== characterId) return;
        if (!isGM && row.gms_only) return;
        onRoll(row.id, convertFromDatabase(row));
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        const baseQuery = campaignId
          ? supabase.from("campaign_game_log").select("*").eq("campaign_id", parentValue).eq("character_id", characterId)
          : supabase.from("character_game_log").select("*").eq("character_id", characterId);

        const query = isGM
          ? baseQuery.order("timestamp", { ascending: false }).limit(1)
          : baseQuery.eq("gms_only", false).order("timestamp", { ascending: false }).limit(1);

        Promise.resolve(query).then(({ data, error }) => {
          if (error) {
            console.error(error);
            onError("Error getting new logs.");
            return;
          }
          if (data && data.length > 0) {
            const row = data[0] as LogRow;
            onRoll(row.id, convertFromDatabase(row));
          }
        });
      }
    });

  return () => supabase.removeChannel(channel);
}
