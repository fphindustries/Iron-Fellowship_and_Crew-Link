import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";
import { Roll } from "types/DieRolls.type";

interface GameLogRow {
  id: string;
  dataJson: Omit<Roll, "timestamp"> & { timestamp: string };
}

export const gameLogKeys = {
  all: ["game-log"] as const,
  entity: (entityType: string, entityId: string) =>
    ["game-log", entityType, entityId] as const,
  list: (entityType: string, entityId: string, limit: number) =>
    ["game-log", entityType, entityId, limit] as const,
};

function toRoll(row: GameLogRow): { id: string; roll: Roll } {
  return {
    id: row.id,
    roll: {
      ...row.dataJson,
      timestamp: new Date(row.dataJson.timestamp),
    } as Roll,
  };
}

export function useGameLogQuery({
  entityType,
  entityId,
  limit,
  isGM,
}: {
  entityType?: string;
  entityId?: string;
  limit: number;
  isGM?: boolean;
}) {
  return useQuery({
    queryKey: gameLogKeys.list(entityType ?? "", entityId ?? "", limit),
    queryFn: async () => {
      const rows = await api.get<GameLogRow[]>(
        `/api/game-log?entityType=${entityType}&entityId=${entityId}&limit=${limit}`
      );
      return rows
        .map(toRoll)
        .filter(({ roll }) => isGM || !roll.gmsOnly);
    },
    enabled: !!(entityType && entityId),
  });
}

export function useAddRollMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      roll,
    }: {
      entityType: string;
      entityId: string;
      roll: Roll;
    }) =>
      api
        .post<{ id: string }>(
          `/api/game-log?entityType=${entityType}&entityId=${entityId}`,
          roll
        )
        .then((r) => r.id),
    onSuccess: (_, { entityType, entityId }) => {
      qc.invalidateQueries({
        queryKey: gameLogKeys.entity(entityType, entityId),
      });
    },
  });
}

export function useUpdateRollMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      entityType,
      roll,
    }: {
      id: string;
      entityType: string;
      roll: Roll;
    }) => api.patch<void>(`/api/game-log/${id}?entityType=${entityType}`, roll),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gameLogKeys.all });
    },
  });
}

export function useRemoveRollMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/api/game-log/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gameLogKeys.all });
    },
  });
}
