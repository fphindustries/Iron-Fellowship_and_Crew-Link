import { useQuery } from "@tanstack/react-query";
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
          ? api.get<{ dataJson?: Record<string, unknown> }>(
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
      const gmProperties =
        gmRow.status === "fulfilled" ? gmRow.value?.dataJson ?? null : null;
      return { notes, gmProperties };
    },
    enabled: !!worldId && !!locationId,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
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
