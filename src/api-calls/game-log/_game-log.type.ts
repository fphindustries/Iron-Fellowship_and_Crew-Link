// Legacy Firestore document types — no longer used in application code.
// Kept as reference only.

export interface GameLogDocument {
  uid: string;
  gmsOnly: boolean;
  timestamp: string; // ISO date string
  type: number;
  rollLabel: string;
  data: Record<string, unknown>;
}
