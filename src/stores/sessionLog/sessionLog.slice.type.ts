import { Unsubscribe } from "firebase/firestore";
import {
  SessionDocument,
  SessionLogEvent,
  MoveSessionEvent,
  OracleSessionEvent,
  StatChangeSessionEvent,
  ProgressSessionEvent,
  BaseSessionEvent,
  CombatStartSessionEvent,
  CombatEndSessionEvent,
} from "types/SessionLog.type";

export interface SessionLogSliceData {
  activeSessionId?: string;
  activeSession?: SessionDocument;
  events: { [key: string]: SessionLogEvent };
  totalEventsToLoad: number;
  loading: boolean;
  mostRecentPastSession?: SessionDocument & { id: string };
  mostRecentPastSessionEvents: { [key: string]: SessionLogEvent };
}

export interface SessionLogSliceActions {
  startSession: (params: {
    characterId?: string;
    campaignId?: string;
    title?: string;
  }) => Promise<string>;
  endSession: (summary?: string) => Promise<void>;

  logMoveEvent: (
    event: Omit<MoveSessionEvent, keyof BaseSessionEvent | "type">
  ) => Promise<string>;
  logStatChangeEvent: (
    event: Omit<StatChangeSessionEvent, keyof BaseSessionEvent | "type">
  ) => void;
  logProgressEvent: (
    event: Omit<ProgressSessionEvent, keyof BaseSessionEvent | "type">
  ) => void;
  logJournalEvent: (text: string, isAiGenerated?: boolean) => void;
  logOracleEvent: (
    event: Omit<OracleSessionEvent, keyof BaseSessionEvent | "type">
  ) => void;
  logCombatStartEvent: (
    event: Omit<CombatStartSessionEvent, keyof BaseSessionEvent | "type">
  ) => void;
  logCombatEndEvent: (
    event: Omit<CombatEndSessionEvent, keyof BaseSessionEvent | "type">
  ) => void;
  updateMoveEventNarrative: (eventId: string, narrative: string) => void;
  deleteEvent: (eventId: string) => void;

  loadMoreEvents: () => void;

  subscribeToActiveSession: (params: {
    campaignId?: string;
    characterId?: string;
  }) => Unsubscribe;

  subscribeToSessionEvents: (params: {
    sessionId: string;
    campaignId?: string;
    characterId?: string;
    totalEventsToLoad: number;
  }) => Unsubscribe;

  loadMostRecentPastSession: (params: {
    campaignId?: string;
    characterId?: string;
  }) => void;

  resetStore: () => void;
}

export type SessionLogSlice = SessionLogSliceData & SessionLogSliceActions;
