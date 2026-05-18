import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "config/api.config";
import { Note } from "types/Notes.type";

interface NoteRow {
  id: string;
  title?: string;
  sortOrder?: number;
  shared?: boolean;
}

interface NoteContentRow {
  content?: { data?: number[] } | number[];
}

export const noteKeys = {
  all: ["notes"] as const,
  list: (entityType: string, entityId: string) =>
    ["notes", "list", entityType, entityId] as const,
  content: (noteId: string) => ["notes", "content", noteId] as const,
};

function toNote(row: NoteRow): Note {
  return {
    noteId: row.id,
    title: row.title ?? "",
    order: row.sortOrder ?? 0,
    shared: row.shared ?? false,
  };
}

function toContent(row: NoteContentRow): Uint8Array | null {
  if (!row?.content) return null;
  const raw = Array.isArray(row.content)
    ? row.content
    : (row.content as { data?: number[] }).data ?? [];
  return new Uint8Array(raw);
}

export function useNotesQuery({
  entityType,
  entityId,
  enabled = true,
}: {
  entityType: string;
  entityId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: noteKeys.list(entityType, entityId ?? ""),
    queryFn: () =>
      api
        .get<NoteRow[]>(`/api/notes?entityType=${entityType}&entityId=${entityId}`)
        .then((rows) => rows.map(toNote)),
    enabled: enabled && !!entityId,
  });
}

export function useNoteContentQuery({
  noteId,
  entityType,
  entityId,
}: {
  noteId?: string;
  entityType?: string;
  entityId?: string;
}) {
  return useQuery({
    queryKey: noteKeys.content(noteId ?? ""),
    queryFn: () =>
      api
        .get<NoteContentRow>(
          `/api/notes/${noteId}/content?entityType=${entityType}&entityId=${entityId}`
        )
        .then(toContent),
    enabled: !!(noteId && entityType && entityId),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
}

export function useAddNoteMutation(entityType: string, entityId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: { title: string; sortOrder: number; shared: boolean }) =>
      api
        .post<{ id: string }>(
          `/api/notes?entityType=${entityType}&entityId=${entityId}`,
          note
        )
        .then((r) => r.id),
    onSuccess: () => {
      if (entityId) {
        qc.invalidateQueries({ queryKey: noteKeys.list(entityType, entityId) });
      }
    },
  });
}

export function useUpdateNoteTitleMutation(entityType: string, entityId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, title }: { noteId: string; title: string }) =>
      api.patch<void>(`/api/notes/${noteId}`, { title }),
    onSuccess: () => {
      if (entityId) {
        qc.invalidateQueries({ queryKey: noteKeys.list(entityType, entityId) });
      }
    },
  });
}

export function useUpdateNoteContentMutation() {
  return useMutation({
    mutationFn: ({
      noteId,
      title,
      content,
      isBeaconRequest,
    }: {
      noteId: string;
      title: string;
      content?: Uint8Array;
      isBeaconRequest?: boolean;
    }) => {
      const body: { title: string; content?: number[] } = { title };
      if (content) {
        body.content = Array.from(content);
      }
      if (isBeaconRequest) {
        navigator.sendBeacon(`/api/notes/${noteId}`, JSON.stringify(body));
        return Promise.resolve();
      }
      return api.patch<void>(`/api/notes/${noteId}`, body);
    },
  });
}

export function useUpdateNoteOrderMutation(entityType: string, entityId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, order }: { noteId: string; order: number }) =>
      api.patch<void>(`/api/notes/${noteId}`, { sortOrder: order }),
    onMutate: async ({ noteId, order }) => {
      if (!entityId) return;
      const key = noteKeys.list(entityType, entityId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Note[]>(key);
      qc.setQueryData<Note[]>(key, (old = []) => {
        const updated = old.map((n) =>
          n.noteId === noteId ? { ...n, order } : n
        );
        return [...updated].sort((a, b) => a.order - b.order);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (!entityId || !ctx?.previous) return;
      qc.setQueryData(noteKeys.list(entityType, entityId), ctx.previous);
    },
    onSettled: () => {
      if (entityId) {
        qc.invalidateQueries({ queryKey: noteKeys.list(entityType, entityId) });
      }
    },
  });
}

export function useUpdateNoteSharedMutation(entityType: string, entityId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, shared }: { noteId: string; shared: boolean }) =>
      api.patch<void>(`/api/notes/${noteId}`, { shared }),
    onSuccess: () => {
      if (entityId) {
        qc.invalidateQueries({ queryKey: noteKeys.list(entityType, entityId) });
      }
    },
  });
}

export function useRemoveNoteMutation(entityType: string, entityId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => api.del<void>(`/api/notes/${noteId}`),
    onSuccess: () => {
      if (entityId) {
        qc.invalidateQueries({ queryKey: noteKeys.list(entityType, entityId) });
      }
    },
  });
}
