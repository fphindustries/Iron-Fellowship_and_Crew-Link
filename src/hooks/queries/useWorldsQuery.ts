import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";
import { Truth, World } from "types/World.type";
import { useStore } from "stores/store";
import { shallow } from "zustand/shallow";
import { getSystem } from "hooks/useGameSystem";
import { GAME_SYSTEMS } from "types/GameSystems.type";
import { WorldAiSettings } from "types/AI.type";

export type WorldWithId = World & { id: string };

export interface WorldApiRow {
  id: string;
  name: string;
  ownerIds?: string[];
  settingKey?: string;
  newTruthsJson?: Record<string, Truth>;
  newTruths?: Record<string, Truth>;
  worldDescriptionBytes?: number[] | null;
  system?: string;
}

export const worldKeys = {
  all: ["worlds"] as const,
  list: (uid: string) => ["worlds", "list", uid] as const,
  detail: (id: string) => ["worlds", "detail", id] as const,
  aiSettings: (id: string) => ["worlds", "detail", id, "ai-settings"] as const,
};

function toWorldDocument(row: WorldApiRow): WorldWithId {
  return {
    id: row.id,
    name: row.name,
    ownerIds: row.ownerIds ?? [],
    settingKey: row.settingKey ?? "",
    newTruths: row.newTruthsJson ?? row.newTruths ?? {},
    worldDescription: row.worldDescriptionBytes
      ? new Uint8Array(
          Array.isArray(row.worldDescriptionBytes)
            ? row.worldDescriptionBytes
            : (row.worldDescriptionBytes as { data?: number[] }).data ?? []
        )
      : undefined,
  };
}

export function useWorldsQuery(uid: string | undefined) {
  return useQuery({
    queryKey: worldKeys.list(uid ?? ""),
    queryFn: async () => {
      const rows = await api.get<WorldApiRow[]>(`/api/worlds?uid=${uid}`);
      return rows.map(toWorldDocument);
    },
    enabled: !!uid,
  });
}

export function useWorldQuery(id: string | undefined) {
  return useQuery({
    queryKey: worldKeys.detail(id ?? ""),
    queryFn: async () => {
      const row = await api.get<WorldApiRow>(`/api/worlds/${id}`);
      return toWorldDocument(row);
    },
    enabled: !!id,
  });
}

export function useWorldAiSettingsQuery(id: string | undefined) {
  return useQuery({
    queryKey: worldKeys.aiSettings(id ?? ""),
    queryFn: () => api.get<WorldAiSettings>(`/api/worlds/${id}/ai-settings`),
    enabled: !!id,
  });
}

export function useAllWorldsQuery() {
  const uid = useStore((store) => store.auth.user?.id);
  const campaignWorldIds = useStore((store) => {
    const ids = new Set<string>();
    Object.values(store.campaigns.campaignMap).forEach((c) => {
      if (c.worldId) ids.add(c.worldId);
    });
    return Array.from(ids);
  }, shallow);

  const ownedQuery = useWorldsQuery(uid);
  const ownedIds = new Set((ownedQuery.data ?? []).map((w) => w.id));
  const nonOwnedIds = campaignWorldIds.filter((id) => !ownedIds.has(id));

  const nonOwnedQueries = useQueries({
    queries: nonOwnedIds.map((id) => ({
      queryKey: worldKeys.detail(id),
      queryFn: async () => {
        const row = await api.get<WorldApiRow>(`/api/worlds/${id}`);
        return toWorldDocument(row);
      },
    })),
  });

  const nonOwnedWorlds = nonOwnedQueries.flatMap((q) => (q.data ? [q.data] : []));

  return {
    data: [...(ownedQuery.data ?? []), ...nonOwnedWorlds] as WorldWithId[],
    isLoading: ownedQuery.isLoading,
    error: ownedQuery.error,
  };
}

export function useCreateWorldMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const system = getSystem();
      const defaultSettingKey = system === GAME_SYSTEMS.IRONSWORN ? "ironlands" : "the_forge";
      return api.post<WorldApiRow>("/api/worlds", {
        name: "New World",
        system: system === GAME_SYSTEMS.IRONSWORN ? "ironsworn" : "starforged",
        settingKey: defaultSettingKey,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: worldKeys.all }),
  });
}

export function useUpdateWorldMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<WorldApiRow>) => api.patch<WorldApiRow>(`/api/worlds/${id}`, body),
    onSuccess: () => {
      if (!id) return;
      qc.invalidateQueries({ queryKey: worldKeys.detail(id) });
      qc.invalidateQueries({ queryKey: worldKeys.all });
    },
  });
}

export function useUpdateWorldAiSettingsMutation(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<WorldAiSettings>) =>
      api.patch<WorldAiSettings>(`/api/worlds/${id}/ai-settings`, settings),
    onSuccess: (settings, variables) => {
      if (!id) return;
      qc.setQueryData<WorldAiSettings>(worldKeys.aiSettings(id), (current) => ({
        ...(current ?? {}),
        ...variables,
        ...(settings ?? {}),
      }));
      qc.invalidateQueries({ queryKey: worldKeys.aiSettings(id) });
    },
  });
}

export function useDeleteWorldMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/worlds/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: worldKeys.all }),
  });
}
