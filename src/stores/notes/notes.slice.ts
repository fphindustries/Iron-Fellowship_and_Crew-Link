import { CreateSliceType } from "stores/store.type";
import { NoteSource, NotesSlice } from "./notes.slice.type";
import { defaultNotesSlice } from "./notes.slice.default";
import { api } from "config/api.config";

function toNote(row: any) {
  return {
    noteId: row.id,
    title: row.title ?? "",
    order: row.sortOrder ?? 0,
    shared: row.shared ?? false,
  };
}

export const createNotesSlice: CreateSliceType<NotesSlice> = (
  set,
  getState
) => ({
  ...defaultNotesSlice,

  subscribe: (campaignId, loadAllCampaignDocs, characterId) => {
    if (!campaignId && !characterId) return () => {};
    let active = true;

    set((store) => {
      store.notes.loading = true;
    });

    const fetches: Promise<void>[] = [];

    if (characterId) {
      fetches.push(
        api
          .get<any[]>(`/api/notes?entityType=character&entityId=${characterId}`)
          .then((rows) => {
            if (!active) return;
            set((store) => {
              store.notes.notes[NoteSource.Character] = rows.map(toNote);
            });
          })
          .catch(() => {})
      );
    }

    if (campaignId && loadAllCampaignDocs) {
      fetches.push(
        api
          .get<any[]>(`/api/notes?entityType=campaign&entityId=${campaignId}`)
          .then((rows) => {
            if (!active) return;
            set((store) => {
              store.notes.notes[NoteSource.Campaign] = rows.map(toNote);
            });
          })
          .catch(() => {})
      );
    }

    Promise.all(fetches)
      .then(() => {
        if (!active) return;
        set((store) => {
          store.notes.loading = false;
        });
      })
      .catch(() => {
        if (!active) return;
        set((store) => {
          store.notes.loading = false;
          store.notes.error = "Failed to load notes.";
        });
      });

    return () => {
      active = false;
    };
  },

  subscribeToNoteContent: (note) => {
    const state = getState();
    const campaignId = state.campaigns.currentCampaign.currentCampaignId;
    const characterId = state.characters.currentCharacter.currentCharacterId;
    if (!campaignId && !characterId) return () => {};

    const entityType = note.source === NoteSource.Campaign ? "campaign" : "character";
    const entityId = note.source === NoteSource.Campaign ? campaignId : characterId;
    if (!entityId) return () => {};

    let active = true;

    api
      .get<any>(`/api/notes/${note.id}/content?entityType=${entityType}&entityId=${entityId}`)
      .then((row) => {
        if (!active) return;
        const content = row?.content
          ? new Uint8Array(row.content.data ?? row.content)
          : null;
        set((store) => {
          if (
            typeof store.notes.openNote !== "string" &&
            store.notes.openNote?.id === note.id
          ) {
            store.notes.openNoteContent = content;
          }
        });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  },

  setOpenNoteId: (openNote) => {
    set((store) => {
      const currentOpenNote = store.notes.openNote;
      if (
        !currentOpenNote ||
        !openNote ||
        typeof currentOpenNote === "string" ||
        typeof openNote === "string"
      ) {
        store.notes.openNote = openNote;
        store.notes.openNoteContent = undefined;
      } else if (
        currentOpenNote.id !== openNote.id ||
        currentOpenNote.source !== openNote.source
      ) {
        store.notes.openNote = openNote;
        store.notes.openNoteContent = undefined;
      }
    });
  },

  temporarilyReorderNotes: (note, order) => {
    set((store) => {
      const noteIndex = store.notes.notes[note.source].findIndex(
        (noteItem) => note.id === noteItem.noteId
      );
      if (typeof noteIndex !== "number" || noteIndex < 0) return;
      store.notes.notes[note.source][noteIndex].order = order;
      store.notes.notes[note.source].sort((n1, n2) => n1.order - n2.order);
    });
  },

  addNote: (source, order, shared) => {
    const state = getState();
    const campaignId = state.campaigns.currentCampaign.currentCampaignId;
    const characterId = state.characters.currentCharacter.currentCharacterId;
    const entityType = source === NoteSource.Campaign ? "campaign" : "character";
    const entityId = source === NoteSource.Campaign ? campaignId : characterId;
    if (!entityId) return Promise.reject("Entity ID not defined");
    return api
      .post<any>(
        `/api/notes?entityType=${entityType}&entityId=${entityId}`,
        { title: "", sortOrder: order, shared: shared ?? false }
      )
      .then((row) => row.id as string);
  },

  updateNote: (source, campaignId, characterId, noteId, title, content, isBeaconRequest) => {
    const body: any = { title };
    if (content) {
      body.content = Array.from(content);
    }
    if (isBeaconRequest) {
      navigator.sendBeacon(`/api/notes/${noteId}`, JSON.stringify(body));
      return Promise.resolve();
    }
    return api.patch<void>(`/api/notes/${noteId}`, body);
  },

  updateNoteOrder: (note, order) => {
    return api.patch<void>(`/api/notes/${note.id}`, { sortOrder: order });
  },

  removeNote: (note) => {
    return api.del<void>(`/api/notes/${note.id}`);
  },

  updateNoteShared: (note, shared) => {
    return api.patch<void>(`/api/notes/${note.id}`, { shared });
  },

  resetStore: () => {
    set((store) => {
      store.notes = { ...store.notes, ...defaultNotesSlice };
    });
  },
});
