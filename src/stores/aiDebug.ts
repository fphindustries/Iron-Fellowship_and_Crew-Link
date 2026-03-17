import { create } from "zustand";

export interface AiDebugEntry {
  id: string;
  timestamp: Date;
  label: string;
  payload: unknown;
}

interface AiDebugStore {
  entries: AiDebugEntry[];
  record: (label: string, payload: unknown) => void;
  clear: () => void;
}

let _counter = 0;

export const useAiDebugStore = create<AiDebugStore>((set) => ({
  entries: [],
  record: (label, payload) =>
    set((state) => ({
      entries: [
        { id: String(++_counter), timestamp: new Date(), label, payload },
        ...state.entries,
      ],
    })),
  clear: () => set({ entries: [] }),
}));

export function recordAiCall(label: string, payload: unknown): void {
  useAiDebugStore.getState().record(label, payload);
}
