// Supabase migration: Firestore refs replaced with table name constants.

import { Roll, ROLL_TYPE } from "types/DieRolls.type";
import { CharacterGameLogRow, CampaignGameLogRow } from "lib/database.types";

export const CHARACTER_GAME_LOG_TABLE = "character_game_log" as const;
export const CAMPAIGN_GAME_LOG_TABLE = "campaign_game_log" as const;

export function convertFromDatabase(
  row: CharacterGameLogRow | CampaignGameLogRow
): Roll {
  const data = (row.data ?? {}) as Record<string, unknown>;
  return {
    ...data,
    type: row.type as ROLL_TYPE,
    rollLabel: row.roll_label,
    timestamp: new Date(row.timestamp),
    uid: row.uid,
    gmsOnly: row.gms_only,
    characterId: row.character_id ?? null,
  } as Roll;
}

export function convertRollToInsertData(
  roll: Roll,
  campaignId: string | undefined,
  characterId: string | undefined
): {
  type: number;
  roll_label: string;
  timestamp: string;
  uid: string;
  gms_only: boolean;
  character_id: string | null;
  data: Record<string, unknown>;
  campaign_id?: string;
  character_id_key?: string;
} {
  const {
    type,
    rollLabel,
    timestamp,
    uid,
    gmsOnly,
    characterId: _cid,
    ...rest
  } = roll as unknown as {
    type: number;
    rollLabel: string;
    timestamp: Date;
    uid: string;
    gmsOnly: boolean;
    characterId: string | null;
    [key: string]: unknown;
  };

  return {
    type,
    roll_label: rollLabel,
    timestamp: timestamp instanceof Date ? timestamp.toISOString() : String(timestamp),
    uid,
    gms_only: gmsOnly ?? false,
    character_id: characterId ?? null,
    ...(campaignId ? { campaign_id: campaignId } : {}),
    data: rest as Record<string, unknown>,
  };
}

export function convertRollToUpdateData(
  roll: Roll
): { gms_only?: boolean; data: Record<string, unknown> } {
  const {
    type: _type,
    rollLabel: _rl,
    timestamp: _ts,
    uid: _uid,
    gmsOnly,
    characterId: _cid,
    ...rest
  } = roll as unknown as {
    type: number;
    rollLabel: string;
    timestamp: Date;
    uid: string;
    gmsOnly: boolean;
    characterId: string | null;
    [key: string]: unknown;
  };

  return {
    gms_only: gmsOnly,
    data: rest as Record<string, unknown>,
  };
}
