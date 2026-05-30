import {
  AiCampaignContext,
  AiGuideResponse,
  AiMode,
  BookkeeperLocationUpdate,
  BookkeeperNewNPC,
  BookkeeperNPCUpdate,
  BookkeeperVowUpdate,
} from "types/AI.type";

export type BookkeeperApplyPayload =
  | { type: "vowUpdate"; data: BookkeeperVowUpdate }
  | { type: "npcUpdate"; data: BookkeeperNPCUpdate }
  | { type: "newNPC"; data: BookkeeperNewNPC }
  | { type: "locationUpdate"; data: BookkeeperLocationUpdate };

export interface AiSliceData {
  isRequesting: boolean;
  activeRequestMode?: AiMode;
  isPanelOpen: boolean;
  pendingMode?: AiMode;
  pendingInput?: string;
}

export interface AiSliceActions {
  requestAi: (params: {
    mode: AiMode;
    campaignId: string;
    context: AiCampaignContext;
    worldId?: string;
  }) => Promise<AiGuideResponse>;

  setIsPanelOpen: (open: boolean) => void;

  openWithMode: (mode: AiMode, input?: string) => void;

  clearPending: () => void;

  resetStore: () => void;
}

export type AiSlice = AiSliceData & AiSliceActions;
