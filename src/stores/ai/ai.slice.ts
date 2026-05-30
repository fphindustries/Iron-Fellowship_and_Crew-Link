import { CreateSliceType } from "stores/store.type";
import { AiSlice } from "./ai.slice.type";
import { defaultAiSlice } from "./ai.slice.default";
import { AiGuideResponse } from "types/AI.type";
import { api } from "config/api.config";
import { queryClient } from "lib/queryClient";
import { aiEventKeys } from "hooks/queries/useAiEventsQuery";

export const createAiSlice: CreateSliceType<AiSlice> = (set, getState) => ({
  ...defaultAiSlice,

  requestAi: async ({ mode, campaignId, context, worldId }) => {
    set((store) => {
      store.ai.isRequesting = true;
      store.ai.activeRequestMode = mode;
    });

    try {
      const response = await api.post<AiGuideResponse>("/api/ai/guide", {
        mode,
        campaignId,
        context,
        worldId,
      });
      if (campaignId) {
        queryClient.invalidateQueries({ queryKey: aiEventKeys.list(campaignId) });
      }
      return response;
    } finally {
      set((store) => {
        store.ai.isRequesting = false;
        store.ai.activeRequestMode = undefined;
      });
    }
  },

  setIsPanelOpen: (open) => {
    set((store) => {
      store.ai.isPanelOpen = open;
    });
  },

  openWithMode: (mode, input) => {
    set((store) => {
      store.ai.isPanelOpen = true;
      store.ai.pendingMode = mode;
      store.ai.pendingInput = input ?? "";
    });
  },

  clearPending: () => {
    set((store) => {
      store.ai.pendingMode = undefined;
      store.ai.pendingInput = undefined;
    });
  },

  resetStore: () => {
    set((store) => {
      store.ai = { ...store.ai, ...defaultAiSlice };
    });
  },
});
