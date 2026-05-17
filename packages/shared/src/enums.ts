export enum GAME_SYSTEMS {
  IRONSWORN = "ironsworn",
  STARFORGED = "starforged",
}

export type GameSystemChooser<T> = {
  [key in GAME_SYSTEMS]: T;
};

export enum STATS {
  EDGE = "edge",
  HEART = "heart",
  IRON = "iron",
  SHADOW = "shadow",
  WITS = "wits",
}

export enum Stat {
  Edge = "edge",
  Heart = "heart",
  Iron = "iron",
  Shadow = "shadow",
  Wits = "wits",
}

export enum PlayerConditionMeter {
  Health = "health",
  Spirit = "spirit",
  Supply = "supply",
}

export type StatKeys = keyof typeof Stat;
export type PlayerConditionMeterKeys = keyof typeof PlayerConditionMeter;
export type MoveStatKeys = Stat | PlayerConditionMeter | "companion health";

export type MoveStats = {
  [stat in StatKeys]: number;
} & {
  [conditionMeter in PlayerConditionMeterKeys]: number;
} & {
  companionHealth: { companionName: string; health: number }[];
};

export enum TrackTypes {
  Vow = "vow",
  Journey = "journey",
  Fray = "fray",
  BondProgress = "bondProgress",
  Clock = "clock",
  SceneChallenge = "sceneChallenge",
}

export type ProgressTracks =
  | TrackTypes.BondProgress
  | TrackTypes.Fray
  | TrackTypes.Journey
  | TrackTypes.Vow;
export type TrackSectionProgressTracks =
  | TrackTypes.Fray
  | TrackTypes.Journey
  | TrackTypes.Vow;
export type TrackSectionTracks =
  | TrackSectionProgressTracks
  | TrackTypes.Clock
  | TrackTypes.SceneChallenge;

export enum TrackStatus {
  Active = "active",
  Completed = "completed",
}

export enum Difficulty {
  Troublesome = "troublesome",
  Dangerous = "dangerous",
  Formidable = "formidable",
  Extreme = "extreme",
  Epic = "epic",
}

export enum LEGACY_TrackTypes {
  QUESTS = "quests",
  BONDS = "bonds",
  DISCOVERIES = "discoveries",
}

export enum ROLL_RESULT {
  HIT,
  WEAK_HIT,
  MISS,
}

export enum ROLL_TYPE {
  STAT,
  ORACLE_TABLE,
  TRACK_PROGRESS,
  CLOCK_PROGRESSION,
}

export enum CampaignType {
  Solo = "solo",
  Coop = "coop",
  Guided = "guided",
}

export enum InitiativeStatus {
  HasInitiative = "hasInitiative",
  OutOfCombat = "outOfCombat",
  DoesNotHaveInitiative = "doesNotHaveInitiative",
}

export enum AiEventStatus {
  Pending = "pending",
  Accepted = "accepted",
  Rejected = "rejected",
  Edited = "edited",
}

export enum AiProvider {
  OpenAi = "openai",
  Anthropic = "anthropic",
}

export enum HomebrewContentType {
  Stat = "stat",
  ConditionMeter = "conditionMeter",
  NonLinearMeter = "nonLinearMeter",
  Impact = "impact",
  LegacyTrack = "legacyTrack",
  OracleTable = "oracleTable",
  OracleCollection = "oracleCollection",
  MoveCategory = "moveCategory",
  Move = "move",
  AssetCollection = "assetCollection",
  Asset = "asset",
}

export enum ReferenceSidebarLocation {
  Left = "left",
  Right = "right",
}

export enum DefaultNPCSpecies {
  Ironlander = "ironlander",
  Elf = "elf",
  Giant = "giant",
  Varou = "varou",
  Troll = "troll",
  Other = "other",
}

export enum MapEntryType {
  Path = "path",
  Location = "location",
}

export enum SectorHexTypes {
  Planet = "planet",
  Star = "star",
  Vault = "vault",
  Settlement = "settlement",
  Derelict = "derelict",
  Other = "other",
  Path = "path",
}

export enum Regions {
  Terminus = "Terminus",
  Outlands = "Outlands",
  Expanse = "Expanse",
  Void = "Void",
}

export enum CUSTOM_TRACK_SIZE {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
}
