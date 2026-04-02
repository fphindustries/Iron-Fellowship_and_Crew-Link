import { create } from "zustand";

export interface AiDebugFullPrompt {
  systemBlocks: string[];
  userMessage: string;
  model: string;
  maxTokens: number;
}

export interface AiDebugEntry {
  id: string;
  timestamp: Date;
  label: string;
  payload: unknown;
  fullPrompt?: AiDebugFullPrompt;
}

interface AiDebugStore {
  entries: AiDebugEntry[];
  logPromptEnabled: boolean;
  record: (label: string, payload: unknown, fullPrompt?: AiDebugFullPrompt) => void;
  clear: () => void;
  setLogPromptEnabled: (v: boolean) => void;
}

let _counter = 0;

export const useAiDebugStore = create<AiDebugStore>((set) => ({
  entries: [],
  logPromptEnabled: false,
  record: (label, payload, fullPrompt) =>
    set((state) => ({
      entries: [
        { id: String(++_counter), timestamp: new Date(), label, payload, fullPrompt },
        ...state.entries,
      ],
    })),
  clear: () => set({ entries: [] }),
  setLogPromptEnabled: (v) => set({ logPromptEnabled: v }),
}));

export function recordAiCall(
  label: string,
  payload: unknown,
  fullPrompt?: AiDebugFullPrompt
): void {
  useAiDebugStore.getState().record(label, payload, fullPrompt);
}
