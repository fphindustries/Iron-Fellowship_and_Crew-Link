import { supabase } from "config/supabase.config";
import { AiEventDocument } from "./_ai.type";

function rowToAiEventDocument(row: Record<string, unknown>): AiEventDocument {
  return {
    type: row.type,
    contextSnapshot: row.context_snapshot,
    response: row.response,
    status: row.status,
    canonized: row.canonized,
    createdAt:
      typeof row.created_at === "string"
        ? new Date(row.created_at)
        : new Date(),
    createdBy: row.created_by,
  } as AiEventDocument;
}

export function listenToAiEvents(params: {
  campaignId: string;
  onEvent: (eventId: string, event: AiEventDocument) => void;
  onRemove: (eventId: string) => void;
  onError: (error: string) => void;
}): () => void {
  const { campaignId, onEvent, onRemove, onError } = params;

  // Fetch initial data
  supabase
    .from("ai_events")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(50)
    .then(({ data, error }) => {
      if (error) {
        console.error(error);
        onError("Failed to load AI events.");
        return;
      }
      if (data) {
        for (const row of data) {
          onEvent(row.id as string, rowToAiEventDocument(row as Record<string, unknown>));
        }
      }
    });

  // Subscribe to realtime changes
  const channel = supabase
    .channel(`ai_events:campaign_id=eq.${campaignId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "ai_events",
        filter: `campaign_id=eq.${campaignId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new as Record<string, unknown>;
          onEvent(row.id as string, rowToAiEventDocument(row));
        } else if (payload.eventType === "DELETE") {
          const row = payload.old as Record<string, unknown>;
          if (row.id) {
            onRemove(row.id as string);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        onError("Failed to load AI events.");
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
