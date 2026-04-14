import { supabase } from "config/supabase.config";
import { SessionLogEvent } from "types/SessionLog.type";
import { SessionEventRow } from "lib/database.types";
import { convertEventFromDatabase, SESSION_EVENTS_TABLE } from "./_getRef";

function fetchSessionEvents(
  sessionId: string,
  totalEventsToLoad: number,
  updateEvent: (eventId: string, event: SessionLogEvent) => void,
  onError: (error: string) => void
): void {
  supabase
    .from(SESSION_EVENTS_TABLE)
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: false })
    .limit(totalEventsToLoad)
    .then(({ data, error }) => {
      if (error) {
        console.error(error);
        onError("Error listening to session events.");
        return;
      }
      if (data) {
        (data as SessionEventRow[]).forEach((row) => {
          updateEvent(row.id, convertEventFromDatabase(row));
        });
      }
    });
}

export function listenToSessionEvents(params: {
  sessionId: string;
  campaignId?: string;
  characterId?: string;
  totalEventsToLoad: number;
  updateEvent: (eventId: string, event: SessionLogEvent) => void;
  removeEvent: (eventId: string) => void;
  onError: (error: string) => void;
}): () => void {
  const {
    sessionId,
    campaignId,
    characterId,
    totalEventsToLoad,
    updateEvent,
    removeEvent,
    onError,
  } = params;

  if (!campaignId && !characterId) {
    onError("Either campaign or character ID must be defined.");
    return () => {};
  }

  const channel = supabase
    .channel(`${SESSION_EVENTS_TABLE}:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: SESSION_EVENTS_TABLE,
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          removeEvent((payload.old as { id: string }).id);
        } else {
          fetchSessionEvents(sessionId, totalEventsToLoad, updateEvent, onError);
        }
      }
    )
    .subscribe();

  // Initial fetch
  fetchSessionEvents(sessionId, totalEventsToLoad, updateEvent, onError);

  return () => supabase.removeChannel(channel);
}
