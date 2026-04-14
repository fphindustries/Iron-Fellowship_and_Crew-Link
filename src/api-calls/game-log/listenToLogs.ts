import { supabase } from "config/supabase.config";
import { Roll } from "types/DieRolls.type";
import { CharacterGameLogRow, CampaignGameLogRow } from "lib/database.types";
import { convertFromDatabase } from "./_getRef";

function fetchLogs(
  isCampaign: boolean,
  value: string,
  isGM: boolean,
  totalLogsToLoad: number,
  updateLog: (rollId: string, roll: Roll) => void,
  onError: (error: string) => void
): void {
  type LogRow = CharacterGameLogRow | CampaignGameLogRow;

  const baseQuery = isCampaign
    ? supabase.from("campaign_game_log").select("*").eq("campaign_id", value)
    : supabase.from("character_game_log").select("*").eq("character_id", value);

  const query = isGM
    ? baseQuery.order("timestamp", { ascending: false }).limit(totalLogsToLoad)
    : baseQuery.eq("gms_only", false).order("timestamp", { ascending: false }).limit(totalLogsToLoad);

  Promise.resolve(query).then(({ data, error }) => {
    if (error) {
      console.error(error);
      onError("Error getting new logs.");
      return;
    }
    if (data) {
      (data as LogRow[]).forEach((row) => {
        updateLog(row.id, convertFromDatabase(row));
      });
    }
  });
}

export function listenToLogs(params: {
  isGM: boolean;
  campaignId?: string;
  characterId?: string;
  totalLogsToLoad: number;
  updateLog: (rollId: string, roll: Roll) => void;
  removeLog: (rollId: string) => void;
  onError: (error: string) => void;
}): () => void {
  const {
    isGM,
    campaignId,
    characterId,
    totalLogsToLoad,
    updateLog,
    removeLog,
    onError,
  } = params;

  if (!campaignId && !characterId) {
    onError("Either campaign or character ID must be defined.");
    return () => {};
  }

  const isCampaign = !!campaignId;
  const table = isCampaign ? "campaign_game_log" : "character_game_log";
  const column = isCampaign ? "campaign_id" : "character_id";
  const value = (campaignId ?? characterId) as string;

  const channel = supabase
    .channel(`${table}:${value}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `${column}=eq.${value}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          removeLog((payload.old as { id: string }).id);
        } else {
          fetchLogs(isCampaign, value, isGM, totalLogsToLoad, updateLog, onError);
        }
      }
    )
    .subscribe();

  // Initial fetch
  fetchLogs(isCampaign, value, isGM, totalLogsToLoad, updateLog, onError);

  return () => supabase.removeChannel(channel);
}
