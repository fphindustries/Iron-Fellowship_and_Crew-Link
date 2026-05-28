import { useQueries, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: (uid: string) => ["campaigns", "list", uid] as const,
  detail: (id: string) => ["campaigns", "detail", id] as const,
  assets: (id: string) => ["campaigns", "assets", id] as const,
  tracks: (id: string) => ["campaigns", "tracks", id] as const,
  starship: (id: string) => ["campaigns", "starship", id] as const,
};

export function useCampaignsQuery(uid: string | undefined) {
  return useQuery({
    queryKey: campaignKeys.list(uid ?? ""),
    queryFn: () => api.get<any[]>(`/api/campaigns?uid=${uid}`),
    enabled: !!uid,
  });
}

export function useCampaignQuery(id: string | undefined) {
  return useQuery({
    queryKey: campaignKeys.detail(id ?? ""),
    queryFn: () => api.get<any>(`/api/campaigns/${id}`),
    enabled: !!id,
  });
}

export function useCampaignAssetsQuery(id: string | undefined) {
  return useQuery({
    queryKey: campaignKeys.assets(id ?? ""),
    queryFn: () => api.get<any[]>(`/api/campaigns/${id}/assets`),
    enabled: !!id,
  });
}

export function useCampaignTracksQuery(id: string | undefined) {
  return useQuery({
    queryKey: campaignKeys.tracks(id ?? ""),
    queryFn: () => api.get<any[]>(`/api/campaigns/${id}/tracks`),
    enabled: !!id,
  });
}

export function useCampaignCharactersQueries(characterIds: string[]) {
  return useQueries({
    queries: characterIds.map((characterId) => ({
      queryKey: ["characters", "detail", characterId],
      queryFn: () => api.get<any>(`/api/characters/${characterId}`),
    })),
  });
}

export function useCampaignCharacterAssetsQueries(characterIds: string[]) {
  return useQueries({
    queries: characterIds.map((characterId) => ({
      queryKey: ["characters", "assets", characterId],
      queryFn: () => api.get<any[]>(`/api/characters/${characterId}/assets`),
    })),
  });
}

export function useCampaignCharacterTracksQueries(characterIds: string[]) {
  return useQueries({
    queries: characterIds.map((characterId) => ({
      queryKey: ["characters", "tracks", characterId],
      queryFn: () => api.get<any[]>(`/api/characters/${characterId}/tracks`),
    })),
  });
}

export interface CampaignStarship {
  id: string;
  campaignId: string;
  name: string | null;
  history: string | null;
  quirks: string[];
  image: { url: string; position: { x: number; y: number }; scale: number } | null;
}

export function useCampaignStarshipQuery(id: string | undefined) {
  return useQuery<CampaignStarship | null>({
    queryKey: campaignKeys.starship(id ?? ""),
    queryFn: () => api.get<CampaignStarship | null>(`/api/campaigns/${id}/starship`),
    enabled: !!id,
  });
}

export function useUpsertCampaignStarshipMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Omit<CampaignStarship, "id" | "campaignId">>) =>
      api.patch<CampaignStarship>(`/api/campaigns/${id}/starship`, body),
    onSuccess: (data) => qc.setQueryData(campaignKeys.starship(id), data),
  });
}

export function useDeleteCampaignStarshipMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.del(`/api/campaigns/${id}/starship`),
    onSuccess: () => qc.setQueryData(campaignKeys.starship(id), null),
  });
}

export function useCreateCampaignMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<any>("/api/campaigns", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useUpdateCampaignMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.patch<any>(`/api/campaigns/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.detail(id) }),
  });
}

export function useDeleteCampaignMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}
