import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { SESSION_EVENTS_TABLE } from "./_getRef";

export const updateSessionEventNarrative = createApiFunction<
  {
    sessionId: string;
    eventId: string;
    narrative: string;
    characterId?: string;
    campaignId?: string;
  },
  void
>((params) => {
  const { eventId, narrative, campaignId } = params;

  return new Promise((resolve, reject) => {
    if (!campaignId) {
      reject(new Error("Campaign ID must be defined to update a session event."));
      return;
    }

    // narrative is stored in the data JSONB column
    supabase
      .from(SESSION_EVENTS_TABLE)
      .select("data")
      .eq("id", eventId)
      .single()
      .then(({ data: existing, error: fetchError }) => {
        if (fetchError) {
          reject(fetchError);
          return;
        }
        const updatedData = {
          ...((existing?.data ?? {}) as Record<string, unknown>),
          narrative,
        };
        supabase
          .from(SESSION_EVENTS_TABLE)
          .update({ data: updatedData })
          .eq("id", eventId)
          .then(({ error }) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
      });
  });
}, "Failed to update session event narrative.");
