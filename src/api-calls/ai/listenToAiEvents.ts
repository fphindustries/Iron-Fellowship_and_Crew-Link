import { api } from "config/api.config";
import { AiEventDocument } from "./_ai.type";

function toEvent(row: any): AiEventDocument {
  return {
    ...row,
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
  } as AiEventDocument;
}

export function listenToAiEvents(params: {
  campaignId: string;
  onEvent: (eventId: string, event: AiEventDocument) => void;
  onRemove: (eventId: string) => void;
  onError: (error: string) => void;
}): () => void {
  const { campaignId, onEvent, onError } = params;
  let active = true;
  const seen = new Set<string>();

  const poll = () => {
    api
      .get<any[]>(`/api/ai/events?campaignId=${campaignId}`)
      .then((rows) => {
        if (!active) return;
        rows.forEach((row) => {
          seen.add(row.id);
          onEvent(row.id, toEvent(row));
        });
      })
      .catch(() => {
        if (active) onError("Failed to load AI events.");
      });
  };

  poll();
  const interval = setInterval(poll, 10_000);
  return () => {
    active = false;
    clearInterval(interval);
  };
}
