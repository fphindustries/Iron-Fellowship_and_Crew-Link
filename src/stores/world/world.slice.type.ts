import { CurrentWorldSlice } from "./currentWorld/currentWorld.slice.type";

export interface WorldSliceData {
  currentWorld: CurrentWorldSlice;
}

export interface WorldSliceActions {
  updateWorldGuide: (
    worldId: string,
    guideId: string,
    shouldRemove?: boolean
  ) => Promise<void>;
}

export type WorldSlice = WorldSliceData & WorldSliceActions;
