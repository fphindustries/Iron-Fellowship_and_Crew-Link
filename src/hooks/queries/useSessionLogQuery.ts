import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";
import { SessionLogEvent } from "types/SessionLog.type";

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

export function useStartSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { characterId?: string; campaignId?: string; title?: string }) =>
      api.post<{ id: string }>("/api/sessions", params),
    onSuccess: (_data, params) => {
      qc.invalidateQueries({
        queryKey: sessionLogKeys.active({
          characterId: params.characterId,
          campaignId: params.campaignId,
        }),
      });
      if (params.characterId) {
        qc.invalidateQueries({ queryKey: sessionLogKeys.list("character", params.characterId) });
      }
      if (params.campaignId) {
        qc.invalidateQueries({ queryKey: sessionLogKeys.list("campaign", params.campaignId) });
      }
    },
  });
}

export function useEndSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, summary }: { sessionId: string; summary?: string }) =>
      api.patch(`/api/sessions/${sessionId}`, { isActive: false, summary }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useAddSessionEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, event }: { sessionId: string; event: SessionLogEvent }) =>
      api.post<{ id: string }>(`/api/sessions/${sessionId}/events`, {
        characterId: event.characterId,
        characterName: event.characterName,
        type: event.type,
        dataJson: event,
      }),
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({ queryKey: sessionLogKeys.events(sessionId) });
    },
  });
}

export function useUpdateSessionEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      eventId,
      dataJson,
    }: {
      sessionId: string;
      eventId: string;
      dataJson: object;
    }) => api.patch(`/api/sessions/${sessionId}/events/${eventId}`, { dataJson }),
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({ queryKey: sessionLogKeys.events(sessionId) });
    },
  });
}

export function useDeleteSessionEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, eventId }: { sessionId: string; eventId: string }) =>
      api.del(`/api/sessions/${sessionId}/events/${eventId}`),
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({ queryKey: sessionLogKeys.events(sessionId) });
    },
  });
}
