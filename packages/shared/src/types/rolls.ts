import { ROLL_RESULT, ROLL_TYPE, LEGACY_TrackTypes as LegacyTrackType } from "../enums.js";
import { TrackTypes } from "../enums.js";

export interface BaseRoll {
  type: ROLL_TYPE;
  rollLabel: string;
  timestamp: Date;
  characterId: string | null;
  uid: string;
  gmsOnly: boolean;
}

export interface StatRoll extends BaseRoll {
  type: ROLL_TYPE.STAT;
  moveName?: string;
  moveId?: string;
  action: number;
  challenge1: number;
  challenge2: number;
  modifier?: number;
  adds?: number;
  result: ROLL_RESULT;
  matchedNegativeMomentum?: boolean;
  momentumBurned?: number;
}

export interface OracleTableRoll extends BaseRoll {
  type: ROLL_TYPE.ORACLE_TABLE;
  roll: number | number[];
  result: string;
  text2?: string;
  text3?: string;
  oracleCategoryName?: string;
  oracleId?: string;
  match?: boolean;
}

export interface TrackProgressRoll extends BaseRoll {
  type: ROLL_TYPE.TRACK_PROGRESS;
  challenge1: number;
  challenge2: number;
  trackProgress: number;
  result: ROLL_RESULT;
  trackType: LegacyTrackType;
  moveId?: string;
}

export interface ClockProgressionRoll extends BaseRoll {
  type: ROLL_TYPE.CLOCK_PROGRESSION;
  roll: number;
  oracleTitle: string;
  result: string;
  oracleId?: string;
  match?: boolean;
}

export type Roll =
  | StatRoll
  | OracleTableRoll
  | TrackProgressRoll
  | ClockProgressionRoll;
