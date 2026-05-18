import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";
import { useStore } from "stores/store";

export interface AccessibilitySettings {
  verboseRollResults?: boolean;
}

export const settingsKeys = {
  accessibility: ["settings", "accessibility"] as const,
  oraclePins: (uid: string) => ["settings", "oracle-pins", uid] as const,
  customMoves: (uid: string) => ["settings", "custom-moves", uid] as const,
  customOracles: (uid: string) => ["settings", "custom-oracles", uid] as const,
};

export function useAccessibilitySettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.accessibility,
    queryFn: async () => {
      const row = await api.get<{ dataJson?: AccessibilitySettings } | null>(
        "/api/settings/accessibility"
      );
      return (row?.dataJson ?? {}) as AccessibilitySettings;
    },
  });
}

export function useUpdateAccessibilitySettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<AccessibilitySettings>) =>
      api.patch("/api/settings/accessibility", settings),
    onMutate: async (settings) => {
      await qc.cancelQueries({ queryKey: settingsKeys.accessibility });
      const prev = qc.getQueryData<AccessibilitySettings>(settingsKeys.accessibility);
      qc.setQueryData<AccessibilitySettings>(settingsKeys.accessibility, (old = {}) => ({
        ...old,
        ...settings,
      }));
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(settingsKeys.accessibility, ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.accessibility });
    },
  });
}

export function useOraclePinsQuery() {
  const uid = useStore((s) => s.auth.user?.id ?? "");
  return useQuery({
    queryKey: settingsKeys.oraclePins(uid),
    queryFn: async () => {
      const row = await api.get<{ pinnedOracleIdsJson?: Record<string, boolean> } | null>(
        "/api/settings/oracle"
      );
      return (row?.pinnedOracleIdsJson ?? {}) as Record<string, boolean>;
    },
    enabled: !!uid,
  });
}

export function useTogglePinnedOracleMutation() {
  const qc = useQueryClient();
  const uid = useStore((s) => s.auth.user?.id ?? "");
  return useMutation({
    mutationFn: async ({ oracleId, pinned }: { oracleId: string; pinned: boolean }) => {
      const current =
        qc.getQueryData<Record<string, boolean>>(settingsKeys.oraclePins(uid)) ?? {};
      const updated = { ...current };
      if (pinned) updated[oracleId] = true;
      else delete updated[oracleId];
      await api.patch("/api/settings/oracle", updated);
    },
    onMutate: async ({ oracleId, pinned }) => {
      await qc.cancelQueries({ queryKey: settingsKeys.oraclePins(uid) });
      const prev = qc.getQueryData<Record<string, boolean>>(settingsKeys.oraclePins(uid));
      qc.setQueryData<Record<string, boolean>>(settingsKeys.oraclePins(uid), (old = {}) => {
        const updated = { ...old };
        if (pinned) updated[oracleId] = true;
        else delete updated[oracleId];
        return updated;
      });
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(settingsKeys.oraclePins(uid), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.oraclePins(uid) });
    },
  });
}
