import { CreateSliceType } from "stores/store.type";
import { NotesSlice } from "./notes.slice.type";
import { defaultNotesSlice } from "./notes.slice.default";

export const createNotesSlice: CreateSliceType<NotesSlice> = (set) => ({
  ...defaultNotesSlice,

  setOpenNoteId: (openNote) => {
    set((store) => {
      const current = store.notes.openNote;
      if (
        !current ||
        !openNote ||
        typeof current === "string" ||
        typeof openNote === "string"
      ) {
        store.notes.openNote = openNote;
      } else if (
        current.id !== openNote.id ||
        current.source !== openNote.source
      ) {
        store.notes.openNote = openNote;
      }
    });
  },

  resetStore: () => {
    set((store) => {
      store.notes = { ...store.notes, ...defaultNotesSlice };
    });
  },
});
