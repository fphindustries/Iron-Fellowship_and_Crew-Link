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
  >;
  prompt?: string;
  gameContext: NarrativeGameContext;
}

export interface NarrativeStreamChunk {
  text: string;
}
