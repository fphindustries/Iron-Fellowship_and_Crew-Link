// Supabase migration: Firestore refs replaced with table name constants.

import { Lore } from "types/Lore.type";

export const LORE_TABLE = "lore";
export const LORE_PUBLIC_NOTES_TABLE = "lore_public_notes";
export const LORE_PRIVATE_NOTES_TABLE = "lore_private_notes";

export function constructLoreImagesPath(worldId: string, loreId: string) {
  return `world-images/${worldId}/lore/${loreId}`;
}

/** Convert a Supabase lore row to a domain Lore object. */
export function convertFromDatabase(row: {
  id: string;
  world_id: string;
  name: string;
  data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}): Lore {
  const { name, data, created_at, updated_at } = row;
  return {
    name,
    ...(data ?? {}),
    createdDate: created_at ? new Date(created_at) : new Date(),
    updatedDate: updated_at ? new Date(updated_at) : new Date(),
  } as unknown as Lore;
}

/** Convert a partial Lore update to Supabase update format. */
export function convertToDatabase(lore: Partial<Lore>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { name, createdDate, updatedDate, ...rest } = lore;
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) update.name = name;
  if (Object.keys(rest).length > 0) update.data = rest;
  return update;
}
