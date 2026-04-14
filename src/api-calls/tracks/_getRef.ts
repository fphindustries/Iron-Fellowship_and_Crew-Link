// Supabase migration: Firestore refs replaced with table name constants.

import { Track } from "types/Track.type";

export const CHARACTER_TRACKS_TABLE = "character_tracks";
export const CAMPAIGN_TRACKS_TABLE = "campaign_tracks";

export interface TrackRow {
  id: string;
  label: string;
  type: string;
  description?: string;
  value: number;
  status: string;
  difficulty?: string;
  segments?: number;
  segments_filled?: number;
  oracle_key?: string;
  created_date: string;
}

export function convertToRow(track: Track): Omit<TrackRow, "id"> {
  const { createdDate, ...rest } = track as Track & { createdDate: Date };
  return {
    ...rest,
    created_date: createdDate.toISOString(),
  } as unknown as Omit<TrackRow, "id">;
}

export function convertFromRow(row: TrackRow): Track {
  const { created_date, ...rest } = row;
  return {
    ...rest,
    createdDate: new Date(created_date),
  } as unknown as Track;
}
