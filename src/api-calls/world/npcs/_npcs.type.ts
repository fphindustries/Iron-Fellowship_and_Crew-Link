// Legacy Firestore document types — no longer used in application code.
// Kept as reference only.

export interface NPCDocument {
  name: string;
  pronouns?: string;
  sharedWithPlayers?: boolean;
  imageFilenames?: string[];
  updatedTimestamp: string;
  createdTimestamp: string;
}

export interface GMNPCDocument {
  gmNotes?: string; // Base64-encoded Uint8Array
}

export interface NPCNotesDocument {
  notes?: string; // Base64-encoded Uint8Array
}
