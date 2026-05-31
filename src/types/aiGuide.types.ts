import { MoveSessionEvent } from "./SessionLog.type";

export interface AIGuideState {
  isStreaming: boolean;
  narrativeText: string;
  narratingEventId?: string;
  error?: string;
}

export interface NarrativeGameContext {
  characterName: string;
  worldTruths: string[];
  characterAssets: string[];
  campaignCharacterNames?: string[];
  recentEvents: string[];
  previousSessionSummary?: string;
  characterPronouns?: string;
  callsign?: string;
  characteristics?: string;
  activeCombat?: {
    objective: string;
    enemies: string[];
    position: "in_control" | "in_a_bad_spot";
  } | null;
}

export interface NarrativeDebugOverride {
  systemPrompt?: string;
  userMessage?: string;
  model?: string;
  maxTokens?: number;
}

export interface NarrativeRequestPayload {
  sessionId: string;
  characterId?: string;
  campaignId?: string;
  moveEvent?: Pick<
    MoveSessionEvent,
    | "moveName"
    | "moveId"
    | "stat"
    | "statValue"
    | "playerContext"
    | "outcome"
    | "action"
    | "challengeDice"
    | "score"
  > & {
    outcomeRule?: string;
  };
  prompt?: string;
  gameContext: NarrativeGameContext;
  debugOverride?: NarrativeDebugOverride;
}

export interface NarrativeStreamChunk {
  text: string;
}
