// Legacy Firestore document types — no longer used in application code.
// Kept as reference only.

export interface TrackDocument {
  label: string;
  type: string;
  description?: string;
  value: number;
  status: string;
  difficulty?: string;
  createdTimestamp: string; // ISO date string
}
