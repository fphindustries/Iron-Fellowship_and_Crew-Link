export type AIGuideMode =
  | "sceneFrame"
  | "askOrAnswer"
  | "moveSuggestion"
  | "outcomeNarration"
  | "priceProposal"
  | "oracleInterpretation"
  | "clockAdvance"
  | "sceneChallengeGuidance"
  | "bookkeepingProposal";

export interface AIGuideCurrentScene {
  title: string;
  description: string;
  unresolvedQuestions: string[];
}

export interface AIGuideNPCIntent {
  currentIntent: string;
  firstImpressionRevealed: boolean;
  hiddenAspects: string[];
}

export interface TensionClock {
  id: string;
  label: string;
  segments: number;
  filled: number;
  hiddenFromPlayers: boolean;
  consequence: string;
}

export interface AIGuideProposal {
  id: string;
  mode: AIGuideMode;
  content: string;
  structuredData?: object;
  status: "pending" | "accepted" | "rejected" | "edited";
  createdAt: string;
}

export interface AIGuideSceneChallengeState {
  objective: string;
  progress: number;
  complicationsIntroduced: string[];
}

export interface AIGuideState {
  currentScene: AIGuideCurrentScene;
  canonFacts: string[];
  npcIntents: Record<string, AIGuideNPCIntent>;
  hiddenClocks: TensionClock[];
  tensionClocks: TensionClock[];
  sceneChallengeState: AIGuideSceneChallengeState | null;
  pendingProposals: AIGuideProposal[];
}

export const defaultAIGuideState: AIGuideState = {
  currentScene: {
    title: "",
    description: "",
    unresolvedQuestions: [],
  },
  canonFacts: [],
  npcIntents: {},
  hiddenClocks: [],
  tensionClocks: [],
  sceneChallengeState: null,
  pendingProposals: [],
};
