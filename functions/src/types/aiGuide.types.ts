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
}

export interface NarrativeRequest {
  sessionId: string;
  characterId?: string;
  campaignId?: string;
  moveEvent?: NarrativeMoveEvent;
  prompt?: string;
  gameContext: NarrativeGameContext;
}

export interface NarrativeChunk {
  text: string;
}

export interface NarrativeResponse {
  done: boolean;
}
