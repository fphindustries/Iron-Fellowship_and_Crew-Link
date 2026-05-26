import { useQuery } from "@tanstack/react-query";
import { api } from "config/api.config";

export const sessionLogKeys = {
  active: (params: { characterId?: string; campaignId?: string }) =>
    ["session", "active", params] as const,
  events: (sessionId: string) => ["session", sessionId, "events"] as const,
  list: (entityType: string, entityId: string) =>
    ["sessions", entityType, entityId] as const,
};

export function useActiveSessionQuery(params: {
  characterId?: string;
  campaignId?: string;
}) {
  return useQuery({
    queryKey: sessionLogKeys.active(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params.characterId) qs.set("characterId", params.characterId);
      if (params.campaignId) qs.set("campaignId", params.campaignId);
      return api.get<any>(`/api/sessions/active?${qs.toString()}`);
    },
    enabled: !!(params.characterId || params.campaignId),
  });
}

export function useSessionEventsQuery(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionLogKeys.events(sessionId ?? ""),
    queryFn: () => api.get<any[]>(`/api/sessions/${sessionId}/events`),
    enabled: !!sessionId,
  });
}

export function useSessionsListQuery(entityType: "campaign" | "character", entityId: string | undefined) {
  return useQuery({
    queryKey: sessionLogKeys.list(entityType, entityId ?? ""),
    queryFn: () =>
      api.get<any[]>(
        `/api/${entityType === "campaign" ? "campaigns" : "characters"}/${entityId}/sessions`,
      ),
    enabled: !!entityId,
  });
}
