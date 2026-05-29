import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";

export interface SceneEvent {
  id: string;
  campaignId: string;
  sceneId: string;
  type: string;
  actorId?: string | null;
  visibility: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
}

export interface CreateSceneEventBody {
  sceneId: string;
  type: string;
  actorId?: string | null;
  visibility?: string;
  payloadJson: Record<string, unknown>;
}

export const sceneEventKeys = {
  list: (campaignId: string) => ["scene-events", "list", campaignId] as const,
};

export function useSceneEventsQuery(campaignId: string | undefined) {
  return useQuery({
    queryKey: sceneEventKeys.list(campaignId ?? ""),
    queryFn: () =>
      api.get<SceneEvent[]>(`/api/campaigns/${campaignId}/scene-events`),
    enabled: !!campaignId,
  });
}

export function useAddSceneEventMutation(campaignId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSceneEventBody) =>
      api.post<SceneEvent>(`/api/campaigns/${campaignId}/scene-events`, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: sceneEventKeys.list(campaignId ?? "") }),
  });
}
