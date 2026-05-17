import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: (uid: string) => ["campaigns", "list", uid] as const,
  detail: (id: string) => ["campaigns", "detail", id] as const,
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
