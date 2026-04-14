// Supabase migration: Firestore refs replaced with table name constants.

import { Location } from "types/Locations.type";

export const LOCATIONS_TABLE = "locations";
export const LOCATION_PUBLIC_NOTES_TABLE = "location_public_notes";
export const LOCATION_PRIVATE_NOTES_TABLE = "location_private_notes";

export function constructLocationImagesPath(
  worldId: string,
  locationId: string
) {
  return `world-images/${worldId}/locations/${locationId}`;
}

/** Convert a Supabase locations row to a domain Location object. */
export function convertFromDatabase(row: {
  id: string;
  world_id: string;
  name: string;
  type?: string | null;
  data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}): Location {
  const { name, type, data, created_at, updated_at } = row;
  return {
    name,
    ...(type ? { type } : {}),
    ...(data ?? {}),
    createdDate: created_at ? new Date(created_at) : new Date(),
    updatedDate: updated_at ? new Date(updated_at) : new Date(),
  } as unknown as Location;
}

/** Convert a full Location to Supabase insert format. */
export function convertToDatabase(location: Location): {
  name: string;
  type?: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
} {
  const { name, type, createdDate, updatedDate, ...rest } = location;
  return {
    name,
    ...(type ? { type } : {}),
    data: rest,
    created_at: createdDate?.toISOString() ?? new Date().toISOString(),
    updated_at: updatedDate?.toISOString() ?? new Date().toISOString(),
  };
}

/** Convert a partial Location update to Supabase update format. */
export function convertUpdateDataToDatabase(
  location: Partial<Location>
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { name, type, createdDate, updatedDate, ...rest } = location;
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) update.name = name;
  if (type !== undefined) update.type = type;
  if (Object.keys(rest).length > 0) update.data = rest;
  return update;
}
