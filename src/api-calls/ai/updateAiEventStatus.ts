import { api } from "config/api.config";
import { AiGuideResponse, AiEventStatus } from "./_ai.type";

export function updateAiEventStatus(
  _campaignId: string,
  eventId: string,
  status: AiEventStatus,
  editedResponse?: AiGuideResponse
): Promise<void> {
  return api.patch<void>(`/api/ai/events/${eventId}`, {
    status,
    ...(editedResponse !== undefined ? { response: editedResponse } : {}),
  });
}
