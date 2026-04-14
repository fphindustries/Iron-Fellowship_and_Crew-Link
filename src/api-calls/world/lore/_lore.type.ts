// Legacy Firestore document types — no longer used in application code.
// Kept as reference only.

export interface LoreDocument {
  name: string;
  sharedWithPlayers?: boolean;
  imageFilenames?: string[];
  updatedTimestamp: string;
  createdTimestamp: string;
}

export interface GMLoreDocument {
  gmNotes?: string; // Base64-encoded Uint8Array
}

export interface LoreNotesDocument {
  notes?: string; // Base64-encoded Uint8Array
}
