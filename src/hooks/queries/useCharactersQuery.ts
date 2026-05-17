import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";

export const characterKeys = {
  all: ["characters"] as const,
  list: (uid: string) => ["characters", "list", uid] as const,
  detail: (id: string) => ["characters", "detail", id] as const,
  assets: (id: string) => ["characters", "assets", id] as const,
  tracks: (id: string) => ["characters", "tracks", id] as const,
};

export function useCharactersQuery(uid: string | undefined) {
  return useQuery({
    queryKey: characterKeys.list(uid ?? ""),
    queryFn: () => api.get<any[]>(`/api/characters?uid=${uid}`),
    enabled: !!uid,
  });
}

export function useCharacterQuery(id: string | undefined) {
  return useQuery({
    queryKey: characterKeys.detail(id ?? ""),
    queryFn: () => api.get<any>(`/api/characters/${id}`),
    enabled: !!id,
  });
}

export function useCharacterAssetsQuery(id: string | undefined) {
  return useQuery({
    queryKey: characterKeys.assets(id ?? ""),
    queryFn: () => api.get<any[]>(`/api/characters/${id}/assets`),
    enabled: !!id,
  });
}

export function useCharacterTracksQuery(id: string | undefined) {
  return useQuery({
    queryKey: characterKeys.tracks(id ?? ""),
    queryFn: () => api.get<any[]>(`/api/characters/${id}/tracks`),
    enabled: !!id,
  });
}

export function useCreateCharacterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<any>("/api/characters", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}

export function useUpdateCharacterMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.patch<any>(`/api/characters/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.detail(id) }),
  });
}

export function useDeleteCharacterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/characters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: characterKeys.all }),
  });
}
