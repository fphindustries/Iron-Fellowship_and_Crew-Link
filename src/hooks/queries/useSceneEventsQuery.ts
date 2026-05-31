import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";

export interface SceneEvent {
  id: string;
  campaignId: string;
  sessionId?: string | null;
  sceneId: string;
  type: string;
  actorId?: string | null;
  visibility: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
}

export interface CreateSceneEventBody {
  sessionId?: string | null;
  sceneId: string;
  type: string;
  actorId?: string | null;
  visibility?: string;
  payloadJson: Record<string, unknown>;
}

export const sceneEventKeys = {
  list: (campaignId: string, sessionId?: string) =>
    ["scene-events", "list", campaignId, sessionId ?? "all"] as const,
};

export function useSceneEventsQuery(
  campaignId: string | undefined,
  sessionId?: string,
  enabled = true
) {
  return useQuery({
    queryKey: sceneEventKeys.list(campaignId ?? "", sessionId),
    queryFn: () => {
      const qs = sessionId ? `?${new URLSearchParams({ sessionId })}` : "";
      return api.get<SceneEvent[]>(
        `/api/campaigns/${campaignId}/scene-events${qs}`
      );
    },
    enabled: !!campaignId && enabled,
  });
}

export function useAddSceneEventMutation(campaignId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSceneEventBody) =>
      api.post<SceneEvent>(`/api/campaigns/${campaignId}/scene-events`, body),
    onSuccess: (_data, body) => {
      qc.invalidateQueries({
        queryKey: sceneEventKeys.list(campaignId ?? "", body.sessionId ?? undefined),
      });
      qc.invalidateQueries({
        queryKey: sceneEventKeys.list(campaignId ?? ""),
      });
    },
  });
}

export function useDeleteSceneEventMutation(campaignId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      sessionId,
    }: {
      eventId: string;
      sessionId?: string | null;
    }) => api.del(`/api/campaigns/${campaignId}/scene-events/${eventId}`),
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({
        queryKey: sceneEventKeys.list(campaignId ?? "", sessionId ?? undefined),
      });
      qc.invalidateQueries({
        queryKey: sceneEventKeys.list(campaignId ?? ""),
      });
    },
  });
}
