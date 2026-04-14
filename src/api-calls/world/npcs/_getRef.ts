// Supabase migration: Firestore refs replaced with table name constants.

import { NPC } from "types/NPCs.type";

export const NPCS_TABLE = "npcs";
export const NPC_PUBLIC_NOTES_TABLE = "npc_public_notes";
export const NPC_PRIVATE_NOTES_TABLE = "npc_private_notes";

export function constructNPCImagesPath(worldId: string, npcId: string) {
  return `world-images/${worldId}/npcs/${npcId}`;
}

/** Convert a Supabase npcs row to a domain NPC object. */
export function convertFromDatabase(row: {
  id: string;
  world_id: string;
  name: string;
  pronouns?: string | null;
  description?: string | null;
  data?: Record<string, unknown> | null;
  portrait_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}): NPC {
  const { name, pronouns, data, created_at, updated_at } = row;
  return {
    name,
    ...(pronouns ? { pronouns } : {}),
    ...(data ?? {}),
    createdDate: created_at ? new Date(created_at) : new Date(),
    updatedDate: updated_at ? new Date(updated_at) : new Date(),
  } as unknown as NPC;
}

/** Convert a partial NPC update to Supabase update format. */
export function convertToDatabase(npc: Partial<NPC>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { name, pronouns, createdDate, updatedDate, ...rest } = npc;
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) update.name = name;
  if (pronouns !== undefined) update.pronouns = pronouns;
  if (Object.keys(rest).length > 0) update.data = rest;
  return update;
}
