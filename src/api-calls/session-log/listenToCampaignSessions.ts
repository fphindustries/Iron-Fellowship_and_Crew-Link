import { supabase } from "config/supabase.config";
import { SessionDocument } from "types/SessionLog.type";
import { SessionRow } from "lib/database.types";
import { convertSessionFromDatabase, SESSIONS_TABLE } from "./_getRef";

function fetchCampaignSessions(
  campaignId: string,
  onUpdate: (sessions: { id: string; session: SessionDocument }[]) => void,
  onError: (error: string) => void
): void {
  supabase
    .from(SESSIONS_TABLE)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("started_at", { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        console.error(error);
        onError("Error listening to campaign sessions.");
        return;
      }
      if (data) {
        const sessions = (data as SessionRow[]).map((row) => ({
          id: row.id,
          session: convertSessionFromDatabase(row),
        }));
        onUpdate(sessions);
      }
    });
}

export function listenToCampaignSessions(params: {
  campaignId: string;
  onUpdate: (sessions: { id: string; session: SessionDocument }[]) => void;
  onError: (error: string) => void;
}): () => void {
  const { campaignId, onUpdate, onError } = params;

  const channel = supabase
    .channel(`${SESSIONS_TABLE}:campaign:${campaignId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: SESSIONS_TABLE,
        filter: `campaign_id=eq.${campaignId}`,
      },
      () => {
        fetchCampaignSessions(campaignId, onUpdate, onError);
      }
    )
    .subscribe();

  // Initial fetch
  fetchCampaignSessions(campaignId, onUpdate, onError);

  return () => supabase.removeChannel(channel);
}
