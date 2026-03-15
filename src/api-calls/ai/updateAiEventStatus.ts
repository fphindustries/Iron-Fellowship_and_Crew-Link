import { firestore } from "config/firebase.config";
import { doc, updateDoc } from "firebase/firestore";
import { AiCopilotResponse, AiEventStatus } from "./_ai.type";

export function updateAiEventStatus(
  campaignId: string,
  eventId: string,
  status: AiEventStatus,
  editedResponse?: AiCopilotResponse
): Promise<void> {
  const ref = doc(
    firestore,
    `/campaigns/${campaignId}/ai-events/${eventId}`
  );
  return updateDoc(ref, {
    status,
    ...(editedResponse !== undefined ? { response: editedResponse } : {}),
  });
}
