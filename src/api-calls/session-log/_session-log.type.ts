// Legacy Firestore document types — no longer used in application code.
// Kept as reference only.

export interface SessionLogDocument {
  startedAt: string; // ISO date string
  endedAt?: string; // ISO date string
}

export interface SessionEventDocument {
  timestamp: string; // ISO date string
  type: number;
  data: Record<string, unknown>;
}
