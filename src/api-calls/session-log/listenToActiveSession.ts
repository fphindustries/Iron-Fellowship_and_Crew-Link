import { supabase } from "config/supabase.config";
import { SessionDocument } from "types/SessionLog.type";
import { convertSessionFromDatabase, SESSIONS_TABLE } from "./_getRef";
import { SessionRow } from "lib/database.types";

function fetchActiveSession(
  campaignId: string,
  onSession: (sessionId: string, session: SessionDocument) => void,
  onNoSession: () => void,
  onError: (error: string) => void
): void {
  supabase
    .from(SESSIONS_TABLE)
    .select("*")
    .eq("campaign_id", campaignId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error(error);
        onError("Error listening to active session.");
        return;
      }
      if (!data || data.length === 0) {
        onNoSession();
      } else {
        const row = data[0] as SessionRow;
        onSession(row.id, convertSessionFromDatabase(row));
      }
    });
}

export function listenToActiveSession(params: {
  campaignId?: string;
  characterId?: string;
  onSession: (sessionId: string, session: SessionDocument) => void;
  onNoSession: () => void;
  onError: (error: string) => void;
}): () => void {
  const { campaignId, onSession, onNoSession, onError } = params;

  if (!campaignId) {
    onError("Campaign ID must be defined to listen to active session.");
    return () => {};
  }

  const channel = supabase
    .channel(`${SESSIONS_TABLE}:active:${campaignId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: SESSIONS_TABLE,
        filter: `campaign_id=eq.${campaignId}`,
      },
      () => {
        fetchActiveSession(campaignId, onSession, onNoSession, onError);
      }
    )
    .subscribe();

  // Initial fetch
  fetchActiveSession(campaignId, onSession, onNoSession, onError);

  return () => supabase.removeChannel(channel);
}
