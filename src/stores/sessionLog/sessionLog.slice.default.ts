import { SessionLogSliceData } from "./sessionLog.slice.type";

const DEFAULT_EVENTS_TO_LOAD = 50;

export const defaultSessionLogSlice: SessionLogSliceData = {
  events: {},
  totalEventsToLoad: DEFAULT_EVENTS_TO_LOAD,
  loading: false,
  mostRecentPastSessionEvents: {},
};
