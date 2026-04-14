import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { SESSIONS_TABLE } from "./_getRef";

export const startSession = createApiFunction<
  {
    characterId?: string;
    campaignId?: string;
    title?: string;
  },
  string
>((params) => {
  const { campaignId } = params;

  return new Promise((resolve, reject) => {
    if (!campaignId) {
      reject(new Error("Campaign ID must be defined to start a session."));
      return;
    }

    supabase
      .from(SESSIONS_TABLE)
      .insert({
        campaign_id: campaignId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()
      .then(({ data: inserted, error }) => {
        if (error) {
          reject(error);
        } else {
          resolve(inserted.id);
        }
      });
  });
}, "Failed to start session.");
