import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";

export const worldKeys = {
  all: ["worlds"] as const,
  list: (uid: string) => ["worlds", "list", uid] as const,
  detail: (id: string) => ["worlds", "detail", id] as const,
};

export function useWorldsQuery(uid: string | undefined) {
  return useQuery({
    queryKey: worldKeys.list(uid ?? ""),
    queryFn: () => api.get<any[]>(`/api/worlds?uid=${uid}`),
    enabled: !!uid,
  });
}

export function useWorldQuery(id: string | undefined) {
  return useQuery({
    queryKey: worldKeys.detail(id ?? ""),
    queryFn: () => api.get<any>(`/api/worlds/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorldMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<any>("/api/worlds", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: worldKeys.all }),
  });
}

export function useUpdateWorldMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.patch<any>(`/api/worlds/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: worldKeys.detail(id) }),
  });
}

export function useDeleteWorldMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/worlds/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: worldKeys.all }),
  });
}
