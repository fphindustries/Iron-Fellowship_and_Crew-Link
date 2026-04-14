import { createApiFunction } from "api-calls/createApiFunction";
import { supabase } from "config/supabase.config";
import { SessionLogEvent } from "types/SessionLog.type";
import { convertEventToInsertData } from "./_getRef";

export const addSessionEvent = createApiFunction<
  {
    sessionId: string;
    event: SessionLogEvent;
    characterId?: string;
    campaignId?: string;
  },
  string
>((params) => {
  const { sessionId, event, campaignId } = params;

  return new Promise((resolve, reject) => {
    if (!campaignId) {
      reject(new Error("Campaign ID must be defined for session events."));
      return;
    }

    Promise.resolve(
      supabase
        .from("session_events")
        .insert(convertEventToInsertData(event, sessionId, campaignId) as any)
        .select()
        .single()
    ).then(({ data: inserted, error }) => {
      if (error) {
        reject(error);
      } else {
        resolve(inserted.id);
      }
    });
  });
}, "Failed to log session event.");
