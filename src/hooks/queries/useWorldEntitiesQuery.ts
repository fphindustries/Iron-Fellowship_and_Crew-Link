import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";
import { Location } from "types/Locations.type";
import { NPC } from "types/NPCs.type";
import { Lore } from "types/Lore.type";
import { Sector } from "types/Sector.type";
import { SectorLocationDocument } from "types/SectorLocations.type";

// ── Query keys ──────────────────────────────────────────────────────────────

export const worldEntityKeys = {
  locations: (worldId: string) => ["world", worldId, "locations"] as const,
  locationDetail: (worldId: string, locationId: string) =>
    ["world", worldId, "locations", locationId] as const,
  npcs: (worldId: string) => ["world", worldId, "npcs"] as const,
  npcDetail: (worldId: string, npcId: string) =>
    ["world", worldId, "npcs", npcId] as const,
  lore: (worldId: string) => ["world", worldId, "lore"] as const,
  loreDetail: (worldId: string, loreId: string) =>
    ["world", worldId, "lore", loreId] as const,
  sectors: (worldId: string) => ["world", worldId, "sectors"] as const,
  sectorLocations: (worldId: string, sectorId: string) =>
    ["world", worldId, "sectors", sectorId, "locations"] as const,
};

// ── Row transforms ──────────────────────────────────────────────────────────

function toLocation(row: Record<string, unknown>): Location {
  const imageFilenames = (row.imageFilenames as string[]) ?? [];
  return {
    name: row.name as string,
    imageFilenames,
    imageUrl: imageFilenames[0] ?? undefined,
    updatedDate: row.updatedAt ? new Date(row.updatedAt as string) : new Date(),
    createdDate: row.createdAt ? new Date(row.createdAt as string) : new Date(),
    ...((row.dataJson as object) ?? {}),
  } as Location;
}

function toNPC(row: Record<string, unknown>): NPC {
  const imageFilenames = (row.imageFilenames as string[]) ?? [];
  return {
    name: row.name as string,
    imageFilenames,
    imageUrl: imageFilenames[0] ?? undefined,
    updatedDate: row.updatedAt ? new Date(row.updatedAt as string) : new Date(),
    createdDate: row.createdAt ? new Date(row.createdAt as string) : new Date(),
    ...((row.dataJson as object) ?? {}),
  } as NPC;
}

function toLore(row: Record<string, unknown>): Lore {
  const imageFilenames = (row.imageFilenames as string[]) ?? [];
  return {
    name: row.name as string,
    imageFilenames,
    imageUrl: imageFilenames[0] ?? undefined,
    updatedDate: row.updatedAt ? new Date(row.updatedAt as string) : new Date(),
    createdDate: row.createdAt ? new Date(row.createdAt as string) : new Date(),
    ...((row.dataJson as object) ?? {}),
  } as Lore;
}

function toSector(row: Record<string, unknown>): Sector {
  return {
    name: row.name as string,
    sharedWithPlayers: (row.sharedWithPlayers as boolean) ?? false,
    region: (row.region as string) ?? undefined,
    trouble: (row.trouble as string) ?? undefined,
    map: (row.mapJson as Sector["map"]) ?? {},
    createdDate: row.createdAt ? new Date(row.createdAt as string) : new Date(),
  };
}

// ── Locations ───────────────────────────────────────────────────────────────

export function useLocationsQuery(worldId: string | undefined) {
  return useQuery({
    queryKey: worldEntityKeys.locations(worldId ?? ""),
    queryFn: () =>
      api
        .get<Array<Record<string, unknown>>>(`/api/worlds/${worldId}/locations`)
        .then((rows) => rows.map((r) => ({ id: r.id as string, ...toLocation(r) }))),
    enabled: !!worldId,
  });
}

export function useLocationDetailQuery(
  worldId: string | undefined,
  locationId: string | undefined,
  isOwner: boolean
) {
  return useQuery({
    queryKey: worldEntityKeys.locationDetail(worldId ?? "", locationId ?? ""),
    queryFn: async () => {
      const [notesRow, gmRow] = await Promise.allSettled([
        api.get<{ content?: { data?: number[] } | number[] }>(
          `/api/worlds/${worldId}/locations/${locationId}/notes`
        ),
        isOwner
          ? api.get<{
              content?: { data?: number[] } | number[];
              dataJson?: Record<string, unknown>;
            }>(
              `/api/worlds/${worldId}/locations/${locationId}/private-notes`
            )
          : Promise.resolve(null),
      ]);
      const notes =
        notesRow.status === "fulfilled" && notesRow.value?.content
          ? new Uint8Array(
              Array.isArray(notesRow.value.content)
                ? notesRow.value.content
                : (notesRow.value.content as { data?: number[] }).data ?? []
            )
          : null;
      const privateNotes =
        gmRow.status === "fulfilled" && gmRow.value?.content
          ? new Uint8Array(
              Array.isArray(gmRow.value.content)
                ? gmRow.value.content
                : (gmRow.value.content as { data?: number[] }).data ?? []
            )
          : undefined;
      const gmProperties =
        gmRow.status === "fulfilled"
          ? {
              ...(gmRow.value?.dataJson ?? {}),
              ...(privateNotes ? { gmNotes: privateNotes } : {}),
            }
          : null;
      return { notes, gmProperties };
    },
    enabled: !!worldId && !!locationId,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateLocationMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; imageFilenames?: string[]; dataJson?: object } = {}) =>
      api.post<Record<string, unknown>>(`/api/worlds/${worldId}/locations`, {
        name: body.name ?? "New Location",
        imageFilenames: body.imageFilenames ?? [],
        dataJson: body.dataJson ?? {},
      }),
    onSuccess: () => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.locations(worldId) });
    },
  });
}

export function useUpdateLocationMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ locationId, patch }: { locationId: string; patch: object }) =>
      api.patch<Record<string, unknown>>(`/api/worlds/${worldId}/locations/${locationId}`, patch),
    onSuccess: (_data, { locationId }) => {
      if (!worldId) return;
      qc.invalidateQueries({ queryKey: worldEntityKeys.locations(worldId) });
      qc.invalidateQueries({ queryKey: worldEntityKeys.locationDetail(worldId, locationId) });
    },
  });
}

export function useDeleteLocationMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) =>
      api.del(`/api/worlds/${worldId}/locations/${locationId}`),
    onSuccess: () => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.locations(worldId) });
    },
  });
}

export function useUpdateLocationNotesMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      locationId,
      notes,
      gmProperties,
      privateNotes,
    }: {
      locationId: string;
      notes?: Uint8Array;
      privateNotes?: Uint8Array;
      gmProperties?: object;
    }) => {
      if (notes) {
        return api.patch(`/api/worlds/${worldId}/locations/${locationId}/notes`, {
          content: Array.from(notes),
        });
      }
      if (privateNotes) {
        return api.patch(`/api/worlds/${worldId}/locations/${locationId}/private-notes`, {
          content: Array.from(privateNotes),
        });
      }
      return api.patch(`/api/worlds/${worldId}/locations/${locationId}/private-notes`, {
        dataJson: gmProperties ?? {},
      });
    },
    onSuccess: (_data, { locationId }) => {
      if (worldId) {
        qc.invalidateQueries({ queryKey: worldEntityKeys.locationDetail(worldId, locationId) });
      }
    },
  });
}

// ── NPCs ────────────────────────────────────────────────────────────────────

export function useNPCsQuery(worldId: string | undefined) {
  return useQuery({
    queryKey: worldEntityKeys.npcs(worldId ?? ""),
    queryFn: () =>
      api
        .get<Array<Record<string, unknown>>>(`/api/worlds/${worldId}/npcs`)
        .then((rows) => rows.map((r) => ({ id: r.id as string, ...toNPC(r) }))),
    enabled: !!worldId,
  });
}

export function useNPCDetailQuery(
  worldId: string | undefined,
  npcId: string | undefined,
  isOwner: boolean
) {
  return useQuery({
    queryKey: worldEntityKeys.npcDetail(worldId ?? "", npcId ?? ""),
    queryFn: async () => {
      const [notesRow, gmRow] = await Promise.allSettled([
        api.get<{ content?: { data?: number[] } | number[] }>(
          `/api/worlds/${worldId}/npcs/${npcId}/notes`
        ),
        isOwner
          ? api.get<{ dataJson?: Record<string, unknown> }>(
              `/api/worlds/${worldId}/npcs/${npcId}/private-notes`
            )
          : Promise.resolve(null),
      ]);
      const notes =
        notesRow.status === "fulfilled" && notesRow.value?.content
          ? new Uint8Array(
              Array.isArray(notesRow.value.content)
                ? notesRow.value.content
                : (notesRow.value.content as { data?: number[] }).data ?? []
            )
          : null;
      const gmProperties =
        gmRow.status === "fulfilled" ? gmRow.value?.dataJson ?? null : null;
      return { notes, gmProperties };
    },
    enabled: !!worldId && !!npcId,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateNPCMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; imageFilenames?: string[]; dataJson?: object } = {}) =>
      api.post<Record<string, unknown>>(`/api/worlds/${worldId}/npcs`, {
        name: body.name ?? "New NPC",
        imageFilenames: body.imageFilenames ?? [],
        dataJson: body.dataJson ?? {},
      }),
    onSuccess: () => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.npcs(worldId) });
    },
  });
}

export function useUpdateNPCMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ npcId, patch }: { npcId: string; patch: object }) =>
      api.patch<Record<string, unknown>>(`/api/worlds/${worldId}/npcs/${npcId}`, patch),
    onSuccess: (_data, { npcId }) => {
      if (!worldId) return;
      qc.invalidateQueries({ queryKey: worldEntityKeys.npcs(worldId) });
      qc.invalidateQueries({ queryKey: worldEntityKeys.npcDetail(worldId, npcId) });
    },
  });
}

export function useDeleteNPCMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (npcId: string) => api.del(`/api/worlds/${worldId}/npcs/${npcId}`),
    onSuccess: () => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.npcs(worldId) });
    },
  });
}

export function useUpdateNPCNotesMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      npcId,
      notes,
      privateNotes,
      gmProperties,
    }: {
      npcId: string;
      notes?: Uint8Array;
      privateNotes?: Uint8Array;
      gmProperties?: object;
    }) => {
      if (notes) {
        return api.patch(`/api/worlds/${worldId}/npcs/${npcId}/notes`, {
          content: Array.from(notes),
        });
      }
      if (privateNotes) {
        return api.patch(`/api/worlds/${worldId}/npcs/${npcId}/private-notes`, {
          content: Array.from(privateNotes),
        });
      }
      return api.patch(`/api/worlds/${worldId}/npcs/${npcId}/private-notes`, {
        dataJson: gmProperties ?? {},
      });
    },
    onSuccess: (_data, { npcId }) => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.npcDetail(worldId, npcId) });
    },
  });
}

// ── Lore ────────────────────────────────────────────────────────────────────

export function useLoreQuery(worldId: string | undefined) {
  return useQuery({
    queryKey: worldEntityKeys.lore(worldId ?? ""),
    queryFn: () =>
      api
        .get<Array<Record<string, unknown>>>(`/api/worlds/${worldId}/lore`)
        .then((rows) => rows.map((r) => ({ id: r.id as string, ...toLore(r) }))),
    enabled: !!worldId,
  });
}

export function useLoreDetailQuery(
  worldId: string | undefined,
  loreId: string | undefined,
  isOwner: boolean
) {
  return useQuery({
    queryKey: worldEntityKeys.loreDetail(worldId ?? "", loreId ?? ""),
    queryFn: async () => {
      const [notesRow, gmRow] = await Promise.allSettled([
        api.get<{ content?: { data?: number[] } | number[] }>(
          `/api/worlds/${worldId}/lore/${loreId}/notes`
        ),
        isOwner
          ? api.get<{ dataJson?: Record<string, unknown> }>(
              `/api/worlds/${worldId}/lore/${loreId}/private-notes`
            )
          : Promise.resolve(null),
      ]);
      const notes =
        notesRow.status === "fulfilled" && notesRow.value?.content
          ? new Uint8Array(
              Array.isArray(notesRow.value.content)
                ? notesRow.value.content
                : (notesRow.value.content as { data?: number[] }).data ?? []
            )
          : null;
      const gmProperties =
        gmRow.status === "fulfilled" ? gmRow.value?.dataJson ?? null : null;
      return { notes, gmProperties };
    },
    enabled: !!worldId && !!loreId,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateLoreMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; imageFilenames?: string[]; dataJson?: object } = {}) =>
      api.post<Record<string, unknown>>(`/api/worlds/${worldId}/lore`, {
        name: body.name ?? "New Lore",
        imageFilenames: body.imageFilenames ?? [],
        dataJson: body.dataJson ?? {},
      }),
    onSuccess: () => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.lore(worldId) });
    },
  });
}

export function useUpdateLoreMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loreId, patch }: { loreId: string; patch: object }) =>
      api.patch<Record<string, unknown>>(`/api/worlds/${worldId}/lore/${loreId}`, patch),
    onSuccess: (_data, { loreId }) => {
      if (!worldId) return;
      qc.invalidateQueries({ queryKey: worldEntityKeys.lore(worldId) });
      qc.invalidateQueries({ queryKey: worldEntityKeys.loreDetail(worldId, loreId) });
    },
  });
}

export function useDeleteLoreMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loreId: string) => api.del(`/api/worlds/${worldId}/lore/${loreId}`),
    onSuccess: () => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.lore(worldId) });
    },
  });
}

export function useUpdateLoreNotesMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      loreId,
      notes,
      privateNotes,
      gmProperties,
    }: {
      loreId: string;
      notes?: Uint8Array;
      privateNotes?: Uint8Array;
      gmProperties?: object;
    }) => {
      if (notes) {
        return api.patch(`/api/worlds/${worldId}/lore/${loreId}/notes`, {
          content: Array.from(notes),
        });
      }
      if (privateNotes) {
        return api.patch(`/api/worlds/${worldId}/lore/${loreId}/private-notes`, {
          content: Array.from(privateNotes),
        });
      }
      return api.patch(`/api/worlds/${worldId}/lore/${loreId}/private-notes`, {
        dataJson: gmProperties ?? {},
      });
    },
    onSuccess: (_data, { loreId }) => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.loreDetail(worldId, loreId) });
    },
  });
}

// ── Sectors ─────────────────────────────────────────────────────────────────

export function useSectorsQuery(worldId: string | undefined) {
  return useQuery({
    queryKey: worldEntityKeys.sectors(worldId ?? ""),
    queryFn: () =>
      api
        .get<Array<Record<string, unknown>>>(`/api/worlds/${worldId}/sectors`)
        .then((rows) =>
          rows.map((r) => ({ id: r.id as string, ...toSector(r) }))
        ),
    enabled: !!worldId,
  });
}

export function useCreateSectorMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Sector> = {}) =>
      api.post<Record<string, unknown>>(`/api/worlds/${worldId}/sectors`, {
        name: body.name ?? "New Sector",
        sharedWithPlayers: body.sharedWithPlayers ?? false,
        region: body.region,
        trouble: body.trouble,
        mapJson: body.map ?? {},
      }),
    onSuccess: () => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.sectors(worldId) });
    },
  });
}

export function useUpdateSectorMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectorId, patch }: { sectorId: string; patch: object }) =>
      api.patch<Record<string, unknown>>(`/api/worlds/${worldId}/sectors/${sectorId}`, patch),
    onSuccess: (_data, { sectorId }) => {
      if (!worldId) return;
      qc.invalidateQueries({ queryKey: worldEntityKeys.sectors(worldId) });
      qc.invalidateQueries({ queryKey: worldEntityKeys.sectorLocations(worldId, sectorId) });
    },
  });
}

export function useDeleteSectorMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sectorId: string) => api.del(`/api/worlds/${worldId}/sectors/${sectorId}`),
    onSuccess: () => {
      if (worldId) qc.invalidateQueries({ queryKey: worldEntityKeys.sectors(worldId) });
    },
  });
}

export function useUpdateSectorNotesMutation(worldId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectorId,
      notes,
      isPrivate,
    }: {
      sectorId: string;
      notes: Uint8Array;
      isPrivate?: boolean;
    }) =>
      api.patch(`/api/worlds/${worldId}/sectors/${sectorId}/notes`, {
        isPrivate: isPrivate ?? false,
        content: Array.from(notes),
      }),
    onSuccess: (_data, { sectorId }) => {
      if (!worldId) return;
      qc.invalidateQueries({ queryKey: worldEntityKeys.sectors(worldId) });
      qc.invalidateQueries({ queryKey: worldEntityKeys.sectorLocations(worldId, sectorId) });
    },
  });
}

export function useSectorLocationsQuery(
  worldId: string | undefined,
  sectorId: string | undefined
) {
  return useQuery({
    queryKey: worldEntityKeys.sectorLocations(worldId ?? "", sectorId ?? ""),
    queryFn: () =>
      api
        .get<Array<{ id: string; dataJson: SectorLocationDocument }>>(
          `/api/worlds/${worldId}/sectors/${sectorId}/locations`
        )
        .then((rows) =>
          Object.fromEntries(rows.map((r) => [r.id, r.dataJson]))
        ),
    enabled: !!worldId && !!sectorId,
  });
}

export function useCreateSectorLocationMutation(
  worldId: string | undefined,
  sectorId: string | undefined
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dataJson: SectorLocationDocument) =>
      api.post<Record<string, unknown>>(
        `/api/worlds/${worldId}/sectors/${sectorId}/locations`,
        dataJson
      ),
    onSuccess: () => {
      if (worldId && sectorId) {
        qc.invalidateQueries({ queryKey: worldEntityKeys.sectorLocations(worldId, sectorId) });
      }
    },
  });
}

export function useUpdateSectorLocationMutation(
  worldId: string | undefined,
  sectorId: string | undefined
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ locationId, dataJson }: { locationId: string; dataJson: SectorLocationDocument }) =>
      api.patch(
        `/api/worlds/${worldId}/sectors/${sectorId}/locations/${locationId}`,
        dataJson
      ),
    onSuccess: () => {
      if (worldId && sectorId) {
        qc.invalidateQueries({ queryKey: worldEntityKeys.sectorLocations(worldId, sectorId) });
      }
    },
  });
}

export function useDeleteSectorLocationMutation(
  worldId: string | undefined,
  sectorId: string | undefined
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) =>
      api.del(`/api/worlds/${worldId}/sectors/${sectorId}/locations/${locationId}`),
    onSuccess: () => {
      if (worldId && sectorId) {
        qc.invalidateQueries({ queryKey: worldEntityKeys.sectorLocations(worldId, sectorId) });
      }
    },
  });
}
