// Legacy Firestore document types — no longer used in application code.
// Kept as reference only.

export interface SectorDocument {
  name: string;
  sharedWithPlayers?: boolean;
  region?: string;
  trouble?: string;
  map?: Record<string, unknown>;
  createdTimestamp: string;
}
