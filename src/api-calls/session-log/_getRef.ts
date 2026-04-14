// Supabase migration: Firestore refs replaced with table name constants.

import { SessionDocument, SessionLogEvent } from "types/SessionLog.type";
import { SessionRow, SessionEventRow } from "lib/database.types";

export const SESSIONS_TABLE = "sessions" as const;
export const SESSION_EVENTS_TABLE = "session_events" as const;

export function convertSessionFromDatabase(row: SessionRow): SessionDocument {
  return {
    campaignId: row.campaign_id,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
    isActive: !row.ended_at,
  };
}

export function convertEventFromDatabase(row: SessionEventRow): SessionLogEvent {
  const data = (row.data ?? {}) as Record<string, unknown>;
  return {
    ...data,
    type: row.type,
    sessionId: row.session_id,
    timestamp: new Date(row.timestamp),
    uid: row.uid,
  } as SessionLogEvent;
}

export function convertEventToInsertData(
  event: SessionLogEvent,
  sessionId: string,
  campaignId: string
): {
  session_id: string;
  campaign_id: string;
  type: string;
  uid: string;
  timestamp?: string;
  data: Record<string, unknown>;
} {
  const {
    type,
    sessionId: _sid,
    timestamp,
    uid,
    characterId: _cid,
    characterName: _cn,
    ...data
  } = event as unknown as {
    type: string;
    sessionId: string;
    timestamp: Date;
    uid: string;
    characterId: string | null;
    characterName: string;
    [key: string]: unknown;
  };

  return {
    session_id: sessionId,
    campaign_id: campaignId,
    type,
    uid,
    timestamp: timestamp instanceof Date ? timestamp.toISOString() : String(timestamp),
    data: data as Record<string, unknown>,
  };
}
