import { useQuery, useQueries } from "@tanstack/react-query";
import { api } from "config/api.config";
import { UserDocument } from "types/User.type";

export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};

export function useUserQuery(uid: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(uid ?? ""),
    queryFn: () => api.get<UserDocument>(`/api/users/${uid}`),
    enabled: !!uid,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUsersQueries(uids: string[]) {
  return useQueries({
    queries: uids.map((uid) => ({
      queryKey: userKeys.detail(uid),
      queryFn: () => api.get<UserDocument>(`/api/users/${uid}`),
      staleTime: 5 * 60 * 1000,
    })),
  });
}
