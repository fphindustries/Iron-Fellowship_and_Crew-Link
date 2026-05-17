import { CreateSliceType } from "stores/store.type";
import { AiSlice, BookkeeperApplyPayload } from "./ai.slice.type";
import { defaultAiSlice } from "./ai.slice.default";
import { TrackStatus, TrackTypes } from "types/Track.type";
import { api } from "config/api.config";

export const createAiSlice: CreateSliceType<AiSlice> = (set, getState) => ({
  ...defaultAiSlice,

  subscribe: (campaignId) => {
    set((store) => {
      store.ai.loading = true;
      store.ai.error = undefined;
    });

    let active = true;

    api
      .get<any[]>(`/api/ai/events?campaignId=${campaignId}`)
      .then((events) => {
        if (!active) return;
        set((store) => {
          store.ai.loading = false;
          events.forEach((event) => {
            store.ai.events[event.id] = {
              type: event.type,
              contextSnapshot: event.contextSnapshotJson ?? {},
              response: event.responseJson ?? {},
              status: event.status,
              canonized: event.canonized,
              createdAt: new Date(event.createdAt),
              createdBy: event.createdBy,
            } as any;
          });
        });
      })
      .catch((error) => {
        if (!active) return;
        set((store) => {
          store.ai.loading = false;
          store.ai.error = String(error);
        });
      });

    return () => {
      active = false;
    };
  },

  requestAi: async ({ mode, campaignId, context, worldId }) => {
    set((store) => {
      store.ai.isRequesting = true;
      store.ai.activeRequestMode = mode;
    });

    try {
      const response = await api.post<any>("/api/ai/guide", {
        mode,
        campaignId,
        context,
        worldId,
      });
      return response;
    } finally {
      set((store) => {
        store.ai.isRequesting = false;
        store.ai.activeRequestMode = undefined;
      });
    }
  },

  updateEventStatus: async ({ eventId, campaignId: _campaignId, status, editedText }) => {
    const state = getState();
    const event = state.ai.events[eventId];
    if (!event) return;

    await api.patch(`/api/ai/events/${eventId}`, { status, canonized: false });
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

  applyBookkeeperSuggestion: async (payload: BookkeeperApplyPayload) => {
    const state = getState();
    const tracks = state.campaigns.currentCampaign.tracks;
    const npcs = state.worlds.currentWorld.currentWorldNPCs;
    const locations = state.worlds.currentWorld.currentWorldLocations;

    switch (payload.type) {
      case "vowUpdate": {
        const vowMap = tracks.trackMap[TrackStatus.Active][TrackTypes.Vow];
        const entry = Object.entries(vowMap).find(
          ([, v]) => v.label === payload.data.label
        );
        if (entry) {
          await tracks.updateTrack(entry[0], {
            value: payload.data.suggestedProgress,
          });
        }
        break;
      }
      case "npcUpdate": {
        const entry = Object.entries(npcs.npcMap).find(
          ([, n]) => n.name === payload.data.name
        );
        if (entry) {
          const changes = payload.data.changes;
          const gmProps: Record<string, string> = {};
          if (changes.role !== null) gmProps.role = changes.role;
          if (changes.disposition !== null) gmProps.disposition = changes.disposition;
          if (changes.goal !== null) gmProps.goal = changes.goal;
          if (changes.revealedAspect !== null) gmProps.revealedAspect = changes.revealedAspect;
          await npcs.updateNPCGMProperties(entry[0], gmProps);
        }
        break;
      }
      case "newNPC": {
        const npcId = await npcs.createNPC({ name: payload.data.name });
        const gmProps: Record<string, string> = {};
        if (payload.data.role !== null) gmProps.role = payload.data.role;
        if (payload.data.disposition !== null) gmProps.disposition = payload.data.disposition;
        if (Object.keys(gmProps).length > 0) {
          await npcs.updateNPCGMProperties(npcId, gmProps);
        }
        break;
      }
      case "locationUpdate": {
        const entry = Object.entries(locations.locationMap).find(
          ([, l]) => l.name === payload.data.name
        );
        if (entry) {
          const changes = payload.data.changes;
          const gmProps: Record<string, string> = {};
          if (changes.trouble !== null) gmProps.trouble = changes.trouble;
          await locations.updateLocationGMProperties(entry[0], gmProps);
        }
        break;
      }
    }
  },

  resetStore: () => {
    set((store) => {
      store.ai = { ...store.ai, ...defaultAiSlice };
    });
  },
});
