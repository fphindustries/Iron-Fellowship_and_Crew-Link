import { supabase } from "config/supabase.config";
import { SessionDocument } from "types/SessionLog.type";
import { convertSessionFromDatabase, SESSIONS_TABLE } from "./_getRef";

export async function getMostRecentSession(params: {
  campaignId?: string;
  characterId?: string;
}): Promise<{ id: string; session: SessionDocument } | null> {
  const { campaignId } = params;

  if (!campaignId) {
    return null;
  }

  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select("*")
    .eq("campaign_id", campaignId)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const row = data[0];
  return {
    id: row.id,
    session: convertSessionFromDatabase(row),
  };
}
