// Legacy Firestore document types — no longer used in application code.
// Kept as reference only.

export interface LocationDocument {
  name: string;
  description?: string;
  sharedWithPlayers?: boolean;
  imageFilenames?: string[];
  createdTimestamp: string;
  updatedTimestamp: string;
}

export interface GMLocationDocument {
  gmNotes?: string; // Base64-encoded Uint8Array
  fields?: Record<string, unknown>;
}

export interface LocationNotesDocument {
  notes?: string; // Base64-encoded Uint8Array
}
