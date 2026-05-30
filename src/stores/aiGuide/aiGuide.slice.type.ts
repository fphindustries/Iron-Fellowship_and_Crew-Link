import {
  AIGuideCurrentScene,
  AIGuideProposal,
  AIGuideState,
  CanonFact,
  FocusMode,
  SpotlightState,
  TensionClock,
} from "types/AIGuideState.type";

export interface AIGuideSliceData {
  state: AIGuideState | null;
  isLoading: boolean;
  isSaving: boolean;
}

export interface AIGuideSliceActions {
  loadGuideState: (campaignId: string) => Promise<void>;
  saveGuideState: (campaignId: string, state: AIGuideState) => Promise<void>;
  updateScene: (
    campaignId: string,
    scene: Partial<AIGuideCurrentScene>
  ) => Promise<void>;
  addCanonFact: (campaignId: string, fact: string) => Promise<void>;
  addCanonToLedger: (
    campaignId: string,
    entry: Omit<CanonFact, "id" | "createdAt">
  ) => Promise<CanonFact>;
  updateCanonFact: (
    campaignId: string,
    factId: string,
    patch: Partial<Pick<CanonFact, "text" | "status">>
  ) => Promise<void>;
  removeCanonFact: (campaignId: string, factId: string) => Promise<void>;
  addProposal: (campaignId: string, proposal: AIGuideProposal) => Promise<void>;
  updateProposalStatus: (
    campaignId: string,
    proposalId: string,
    status: AIGuideProposal["status"]
  ) => Promise<void>;
  upsertTensionClock: (
    campaignId: string,
    clock: TensionClock
  ) => Promise<void>;
  applyClockAdvance: (
    campaignId: string,
    clockId: string | null,
    clockLabel: string | null,
    advanceBy: number
  ) => Promise<void>;
  setFocusMode: (campaignId: string, mode: FocusMode) => Promise<void>;
  setSpotlight: (campaignId: string, spotlight: SpotlightState) => Promise<void>;
  resetStore: () => void;
}

export type AIGuideSlice = AIGuideSliceData & AIGuideSliceActions;
