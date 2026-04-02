export interface NarrativeMoveEvent {
  moveName: string;
  moveId: string;
  stat?: string;
  statValue?: number;
  playerContext?: string;
  outcome: string;
  action?: number;
  challengeDice?: [number, number];
  score?: number;
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

export interface NarrativeRequest {
  sessionId: string;
  characterId?: string;
  campaignId?: string;
  moveEvent?: NarrativeMoveEvent;
  prompt?: string;
  gameContext: NarrativeGameContext;
  debugOverride?: NarrativeDebugOverride;
}

export interface NarrativeChunk {
  text: string;
}

export interface NarrativeResponse {
  done: boolean;
}
