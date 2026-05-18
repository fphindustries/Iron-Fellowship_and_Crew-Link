import { CreateSliceType } from "stores/store.type";
import { WorldSlice } from "./world.slice.type";
import { defaultWorldSlice } from "./world.slice.default";
import { createCurrentWorldSlice } from "./currentWorld/currentWorld.slice";
import { api } from "config/api.config";

export const createWorldSlice: CreateSliceType<WorldSlice> = (...params) => {
  return {
    ...defaultWorldSlice,
    currentWorld: createCurrentWorldSlice(...params),

    updateWorldGuide: async (worldId, guideId, shouldRemove) => {
      if (shouldRemove) {
        await api.del(`/api/worlds/${worldId}/owners/${guideId}`);
      } else {
        await api.post(`/api/worlds/${worldId}/owners`, { userId: guideId });
      }
    },
  };
};
