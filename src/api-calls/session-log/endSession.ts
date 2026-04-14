import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";

export const endSession = createApiFunction<
  {
    sessionId: string;
    characterId?: string;
    campaignId?: string;
    summary?: string;
  },
  void
>((params) => {
  const { sessionId, campaignId } = params;

  return new Promise((resolve, reject) => {
    if (!campaignId) {
      reject(new Error("Campaign ID must be defined to end a session."));
      return;
    }

    Promise.resolve(
      supabase
        .from("sessions")
        .update({
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
    ).then(({ error }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}, "Failed to end session.");
