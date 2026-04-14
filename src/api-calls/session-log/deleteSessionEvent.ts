import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";

export const deleteSessionEvent = createApiFunction<
  {
    sessionId: string;
    eventId: string;
    characterId?: string;
    campaignId?: string;
  },
  void
>((params) => {
  const { eventId, campaignId } = params;

  return new Promise((resolve, reject) => {
    if (!campaignId) {
      reject(new Error("Campaign ID must be defined to delete a session event."));
      return;
    }

    Promise.resolve(
      supabase.from("session_events").delete().eq("id", eventId)
    ).then(({ error }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}, "Failed to delete session event.");
