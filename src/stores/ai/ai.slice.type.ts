import { Unsubscribe } from "firebase/firestore";
import {
  AiCampaignContext,
  AiCopilotResponse,
  AiEventDocument,
  AiEventStatus,
  AiMode,
  BookkeeperLocationUpdate,
  BookkeeperNewNPC,
  BookkeeperNPCUpdate,
  BookkeeperVowUpdate,
} from "api-calls/ai/_ai.type";

export type BookkeeperApplyPayload =
  | { type: "vowUpdate"; data: BookkeeperVowUpdate }
  | { type: "npcUpdate"; data: BookkeeperNPCUpdate }
  | { type: "newNPC"; data: BookkeeperNewNPC }
  | { type: "locationUpdate"; data: BookkeeperLocationUpdate };

export interface AiSliceData {
  events: Record<string, AiEventDocument>;
  loading: boolean;
  isRequesting: boolean;
  activeRequestMode?: AiMode;
  error?: string;
  isPanelOpen: boolean;
  pendingMode?: AiMode;
  pendingInput?: string;
}

export interface AiSliceActions {
  subscribe: (campaignId: string) => Unsubscribe;

  requestAi: (params: {
    mode: AiMode;
    campaignId: string;
    context: AiCampaignContext;
  }) => Promise<AiCopilotResponse>;

  updateEventStatus: (params: {
    eventId: string;
    campaignId: string;
    status: AiEventStatus;
    editedText?: string;
  }) => Promise<void>;

  setIsPanelOpen: (open: boolean) => void;

  openWithMode: (mode: AiMode, input?: string) => void;

  applyBookkeeperSuggestion: (
    payload: BookkeeperApplyPayload
  ) => Promise<void>;

  clearPending: () => void;

  resetStore: () => void;
}

export type AiSlice = AiSliceData & AiSliceActions;
