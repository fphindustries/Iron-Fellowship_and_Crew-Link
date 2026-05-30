export type AIGuideMode =
  | "sceneFrame"
  | "askOrAnswer"
  | "moveSuggestion"
  | "outcomeNarration"
  | "priceProposal"
  | "oracleInterpretation"
  | "clockAdvance"
  | "sceneChallengeGuidance"
  | "bookkeepingProposal"
  | "actionSuggestions"
  | "intentToMove"
  | "spotlightNudge";

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

export type FocusMode = "standard" | "combat" | "expedition" | "social";

export interface SpotlightState {
  current?: string;
  recent: string[];
  quiet: string[];
}

export interface CanonFact {
  id: string;
  text: string;
  source: string;
  status: "confirmed" | "proposed";
  createdAt: string;
}

export interface LaunchSetupState {
  completedAt: string;
  firstSessionId: string;
  incitingIncident: string;
  sceneMode: "prologue" | "in_medias_res";
  openingScene: string;
  connectionNpcId: string;
  vowTrackId: string;
  swearingCharacterId: string;
  swearMoveResult: {
    action: number;
    challengeDice: [number, number];
    score: number;
    outcome: "hit" | "weak_hit" | "miss";
    momentumApplied: number;
  };
  nextStepPrompt: string;
}

export interface AIGuideState {
  currentScene: AIGuideCurrentScene;
  canonFacts: string[];
  canonLedger: CanonFact[];
  npcIntents: Record<string, AIGuideNPCIntent>;
  hiddenClocks: TensionClock[];
  tensionClocks: TensionClock[];
  sceneChallengeState: AIGuideSceneChallengeState | null;
  pendingProposals: AIGuideProposal[];
  focusMode: FocusMode;
  spotlight: SpotlightState;
  launchSetup?: LaunchSetupState;
}

export const defaultAIGuideState: AIGuideState = {
  currentScene: {
    title: "",
    description: "",
    unresolvedQuestions: [],
  },
  canonFacts: [],
  canonLedger: [],
  npcIntents: {},
  hiddenClocks: [],
  tensionClocks: [],
  sceneChallengeState: null,
  pendingProposals: [],
  focusMode: "standard",
  spotlight: { recent: [], quiet: [] },
};
