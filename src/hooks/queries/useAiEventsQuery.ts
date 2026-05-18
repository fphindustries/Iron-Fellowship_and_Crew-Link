import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";
import { AiEventDocument, AiEventStatus, AiMode, AiCampaignContext, AiGuideResponse } from "types/AI.type";

export type AiEventWithId = AiEventDocument & { id: string };

interface AiEventApiRow {
  id: string;
  type: AiMode;
  contextSnapshotJson?: Partial<AiCampaignContext>;
  responseJson?: AiGuideResponse;
  status: AiEventStatus;
  canonized: boolean;
  createdAt: string;
  createdBy: string;
}

export const aiEventKeys = {
  all: ["ai-events"] as const,
  list: (campaignId: string) => ["ai-events", "list", campaignId] as const,
};

function toAiEvent(row: AiEventApiRow): AiEventWithId {
  return {
    id: row.id,
    type: row.type,
    contextSnapshot: row.contextSnapshotJson ?? {},
    response: row.responseJson ?? ({} as AiGuideResponse),
    status: row.status,
    canonized: row.canonized,
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
  };
}

export function useAiEventsQuery(campaignId: string | undefined) {
  return useQuery({
    queryKey: aiEventKeys.list(campaignId ?? ""),
    queryFn: async () => {
      const rows = await api.get<AiEventApiRow[]>(
        `/api/ai/events?campaignId=${campaignId}`
      );
      return rows.map(toAiEvent);
    },
    enabled: !!campaignId,
  });
}

export function useUpdateAiEventStatusMutation(campaignId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      status,
    }: {
      eventId: string;
      campaignId: string;
      status: AiEventStatus;
      editedText?: string;
    }) => api.patch(`/api/ai/events/${eventId}`, { status, canonized: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiEventKeys.list(campaignId ?? "") });
    },
  });
}
