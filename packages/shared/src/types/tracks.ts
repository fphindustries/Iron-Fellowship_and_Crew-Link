import {
  Difficulty,
  TrackSectionProgressTracks,
  TrackSectionTracks,
  TrackStatus,
  TrackTypes,
  LEGACY_TrackTypes,
  CUSTOM_TRACK_SIZE,
} from "../enums.js";

export interface BaseTrack {
  label: string;
  type: TrackSectionTracks;
  description?: string;
  value: number;
  status: TrackStatus;
  createdDate: Date;
}

export interface ProgressTrack extends BaseTrack {
  type: TrackSectionProgressTracks;
  difficulty: Difficulty;
}

export interface SceneChallenge extends BaseTrack {
  type: TrackTypes.SceneChallenge;
  segmentsFilled: number;
  difficulty: Difficulty;
}

export interface Clock extends BaseTrack {
  type: TrackTypes.Clock;
  segments: number;
  oracleKey?: string;
}

export type Track = ProgressTrack | Clock | SceneChallenge;

export interface LegacyTrack {
  value: number;
  spentExperience?: { [index: number]: boolean };
  isLegacy?: boolean;
}

export type LegacyTrackType = TrackTypes | LEGACY_TrackTypes;

export interface TrackValue<T> {
  value: T;
  selectable: boolean;
}

export interface CustomTrack {
  label: string;
  size: CUSTOM_TRACK_SIZE;
  order: number;
  values: TrackValue<number | string>[];
  rollable: boolean;
}
