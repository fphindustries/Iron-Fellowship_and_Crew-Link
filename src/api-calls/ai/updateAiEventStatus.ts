import { supabase } from "config/supabase.config";
import { AiGuideResponse, AiEventStatus } from "./_ai.type";

export async function updateAiEventStatus(
  campaignId: string,
  eventId: string,
  status: AiEventStatus,
  editedResponse?: AiGuideResponse
): Promise<void> {
  const fields: Record<string, unknown> = { status };
  if (editedResponse !== undefined) {
    fields.response = editedResponse;
  }

  const { error } = await supabase
    .from("ai_events")
    .update(fields as any)
    .eq("id", eventId)
    .eq("campaign_id", campaignId);

  if (error) throw error;
}
