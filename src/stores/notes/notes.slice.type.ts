import { Note } from "types/Notes.type";

export const ROLL_LOG_ID = "roll-log";

export enum NoteSource {
  Character = "character",
  Campaign = "campaign",
}

export interface NotesSliceData {
  openNote?:
    | typeof ROLL_LOG_ID
    | {
        source: NoteSource;
        id: string;
      };
}

export interface NotesSliceActions {
  setOpenNoteId: (
    note?: typeof ROLL_LOG_ID | { source: NoteSource; id: string }
  ) => void;

  resetStore: () => void;
}

export type NotesSlice = NotesSliceData & NotesSliceActions;

// Re-export Note so existing imports keep working
export type { Note };
