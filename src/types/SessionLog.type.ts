import { ROLL_RESULT } from "./DieRolls.type";
import { CombatPosition } from "./combat.types";

export enum SESSION_EVENT_TYPE {
  MOVE = "move",
  ORACLE = "oracle",
  STAT_CHANGE = "stat_change",
  PROGRESS = "progress",
  JOURNAL = "journal",
  COMBAT_START = "combat_start",
  COMBAT_END = "combat_end",
}

export interface BaseSessionEvent {
  type: SESSION_EVENT_TYPE;
  sessionId: string;
  timestamp: Date;
  characterId: string | null;
  characterName: string;
  uid: string;
}

export interface MoveSessionEvent extends BaseSessionEvent {
  type: SESSION_EVENT_TYPE.MOVE;
  moveName: string;
  moveId: string;
  stat?: string;
  statValue?: number;
  playerContext?: string;
  action?: number;
  challengeDice?: [number, number];
  score?: number;
  outcome?: ROLL_RESULT;
  playerNote?: string;
  narrative?: string;
}

export interface OracleSessionEvent extends BaseSessionEvent {
  type: SESSION_EVENT_TYPE.ORACLE;
  oracleName: string;
  oracleId: string;
  roll: number | number[];
  result: string;
  playerNote?: string;
}

export interface StatChangeSessionEvent extends BaseSessionEvent {
  type: SESSION_EVENT_TYPE.STAT_CHANGE;
  stat: string;
  previousValue: number;
  newValue: number;
  cause?: string;
}

export interface ProgressSessionEvent extends BaseSessionEvent {
  type: SESSION_EVENT_TYPE.PROGRESS;
  trackName: string;
  trackType: string;
  previousValue: number;
  newValue: number;
}

export interface JournalSessionEvent extends BaseSessionEvent {
  type: SESSION_EVENT_TYPE.JOURNAL;
  text: string;
  isAiGenerated: boolean;
}

export interface CombatStartSessionEvent extends BaseSessionEvent {
  type: SESSION_EVENT_TYPE.COMBAT_START;
  objective: string;
  enemies: string[];
  position: CombatPosition;
}

export interface CombatEndSessionEvent extends BaseSessionEvent {
  type: SESSION_EVENT_TYPE.COMBAT_END;
  outcome: ROLL_RESULT;
  description?: string;
}

export type SessionLogEvent =
  | MoveSessionEvent
  | OracleSessionEvent
  | StatChangeSessionEvent
  | ProgressSessionEvent
  | JournalSessionEvent
  | CombatStartSessionEvent
  | CombatEndSessionEvent;

export interface SessionDocument {
  characterId?: string;
  campaignId?: string;
  startedAt: Date;
  endedAt?: Date;
  title?: string;
  isActive: boolean;
  summary?: string;
}
