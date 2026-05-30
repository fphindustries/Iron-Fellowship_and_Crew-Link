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

export function useUpdateCampaignWorldMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      worldId,
      ownerIds,
    }: {
      worldId: string | null;
      ownerIds?: string[];
    }) => {
      await api.patch<void>(`/api/campaigns/${id}`, { worldId });
      if (worldId) {
        await Promise.all(
          (ownerIds ?? []).map((userId) =>
            api.post<void>(`/api/worlds/${worldId}/owners`, { userId }).catch(() => undefined)
          )
        );
      }
    },
    onSuccess: () => {
      if (!id) return;
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
      qc.invalidateQueries({ queryKey: ["worlds"] });
    },
  });
}

export function useUpdateCampaignGMMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      remove,
      worldId,
    }: {
      userId: string;
      remove?: boolean;
      worldId?: string;
    }) => {
      if (remove) {
        await api.del<void>(`/api/campaigns/${id}/gms/${userId}`);
        return;
      }
      await api.post<void>(`/api/campaigns/${id}/gms`, { userId });
      if (worldId) {
        await api.post<void>(`/api/worlds/${worldId}/owners`, { userId }).catch(() => undefined);
      }
    },
    onSuccess: () => {
      if (!id) return;
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useUpdateCampaignMemberMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, remove }: { userId: string; remove?: boolean }) =>
      remove
        ? api.del<void>(`/api/campaigns/${id}/members/${userId}`)
        : api.post<void>(`/api/campaigns/${id}/members`, { userId }),
    onSuccess: () => {
      if (!id) return;
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

export function useLeaveCampaignMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      gmIds,
      characterIds,
    }: {
      userId: string;
      gmIds?: string[];
      characterIds?: string[];
    }) => {
      if (gmIds?.includes(userId)) {
        await api.del<void>(`/api/campaigns/${id}/gms/${userId}`).catch(() => undefined);
      }
      await Promise.all(
        (characterIds ?? []).map((characterId) =>
          api.del<void>(`/api/campaigns/${id}/characters/${characterId}`).catch(() => undefined)
        )
      );
      await api.del<void>(`/api/campaigns/${id}/members/${userId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all });
      if (id) qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useUpdateCampaignCharacterMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      characterId,
      userId,
      remove,
    }: {
      characterId: string;
      userId?: string;
      remove?: boolean;
    }) =>
      remove
        ? api.del<void>(`/api/campaigns/${id}/characters/${characterId}`)
        : api.post<void>(`/api/campaigns/${id}/characters`, { characterId, userId }),
    onSuccess: () => {
      if (!id) return;
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all });
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useUpdateCampaignAssetMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      dataJson,
      remove,
    }: {
      assetId?: string;
      dataJson?: object;
      remove?: boolean;
    }) => {
      if (remove && assetId) return api.del<void>(`/api/campaigns/${id}/assets/${assetId}`);
      if (assetId) return api.patch<void>(`/api/campaigns/${id}/assets/${assetId}`, dataJson);
      return api.post<void>(`/api/campaigns/${id}/assets`, dataJson);
    },
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: campaignKeys.assets(id) });
    },
  });
}

export function useCreateCampaignTrackMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, dataJson }: { type?: string; dataJson?: object }) =>
      api.post<Record<string, unknown>>(`/api/campaigns/${id}/tracks`, { type, dataJson }),
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: campaignKeys.tracks(id) });
    },
  });
}

export function useUpdateCampaignTrackMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      trackId,
      dataJson,
      remove,
    }: {
      trackId?: string;
      type?: string;
      dataJson?: object;
      remove?: boolean;
    }) => {
      if (remove && trackId) return api.del<void>(`/api/campaigns/${id}/tracks/${trackId}`);
      if (trackId) return api.patch<void>(`/api/campaigns/${id}/tracks/${trackId}`, dataJson);
      return api.post<void>(`/api/campaigns/${id}/tracks`, { dataJson });
    },
    onSuccess: () => {
      if (id) qc.invalidateQueries({ queryKey: campaignKeys.tracks(id) });
    },
  });
}
