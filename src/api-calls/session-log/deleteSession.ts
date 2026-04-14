import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";

export const deleteSession = createApiFunction<
  {
    sessionId: string;
    characterId?: string;
    campaignId?: string;
  },
  void
>(
  (params) => {
    const { sessionId, campaignId } = params;

    if (!campaignId) {
      return Promise.reject(
        new Error("Campaign ID must be defined to delete a session.")
      );
    }

    return new Promise((resolve, reject) => {
      Promise.resolve(
        supabase.from("sessions").delete().eq("id", sessionId)
      ).then(({ error }) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  },
  "Failed to delete session."
);
