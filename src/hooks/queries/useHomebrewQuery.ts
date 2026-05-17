import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";

export const homebrewKeys = {
  all: ["homebrew"] as const,
  list: (uid: string) => ["homebrew", "list", uid] as const,
  detail: (id: string) => ["homebrew", "detail", id] as const,
  content: (id: string) => ["homebrew", "content", id] as const,
};

export function useHomebrewQuery(uid: string | undefined) {
  return useQuery({
    queryKey: homebrewKeys.list(uid ?? ""),
    queryFn: () => api.get<any[]>("/api/homebrew"),
    enabled: !!uid,
  });
}

export function useHomebrewDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: homebrewKeys.detail(id ?? ""),
    queryFn: () => api.get<any>(`/api/homebrew/${id}`),
    enabled: !!id,
  });
}

export function useHomebrewContentQuery(id: string | undefined) {
  return useQuery({
    queryKey: homebrewKeys.content(id ?? ""),
    queryFn: () => api.get<any[]>(`/api/homebrew/${id}/content`),
    enabled: !!id,
  });
}

export function useCreateHomebrewMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<any>("/api/homebrew", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: homebrewKeys.all }),
  });
}

export function useUpdateHomebrewMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.patch<any>(`/api/homebrew/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: homebrewKeys.detail(id) }),
  });
}

export function useDeleteHomebrewMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/homebrew/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: homebrewKeys.all }),
  });
}
