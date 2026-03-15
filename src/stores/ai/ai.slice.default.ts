import { AiSliceData } from "./ai.slice.type";

export const defaultAiSlice: AiSliceData = {
  events: {},
  loading: false,
  isRequesting: false,
  activeRequestMode: undefined,
  error: undefined,
  isPanelOpen: false,
};
