// Supabase migration: Firestore refs replaced with table name constants.

import { Sector } from "types/Sector.type";

export const SECTORS_TABLE = "sectors";
export const SECTOR_PUBLIC_NOTES_TABLE = "sector_public_notes";
export const SECTOR_PRIVATE_NOTES_TABLE = "sector_private_notes";

/** Convert a Supabase sectors row to a domain Sector object. */
export function convertFromDatabase(row: {
  id: string;
  world_id: string;
  name: string;
  shared_with_players?: boolean | null;
  region?: string | null;
  trouble?: string | null;
  map?: Record<string, unknown> | null;
  created_at?: string | null;
}): Sector {
  return {
    name: row.name,
    sharedWithPlayers: row.shared_with_players ?? true,
    region: row.region ?? undefined,
    trouble: row.trouble ?? undefined,
    map: (row.map ?? {}) as Sector["map"],
    createdDate: row.created_at ? new Date(row.created_at) : new Date(),
  };
}

/** Convert a partial Sector update to Supabase update format. */
export function convertToDatabase(sector: Partial<Sector>): Record<string, unknown> {
  const { name, sharedWithPlayers, region, trouble, map, createdDate } = sector;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (sharedWithPlayers !== undefined) update.shared_with_players = sharedWithPlayers;
  if (region !== undefined) update.region = region;
  if (trouble !== undefined) update.trouble = trouble;
  if (map !== undefined) update.map = map;
  if (createdDate !== undefined) update.created_at = createdDate.toISOString();
  return update;
}
