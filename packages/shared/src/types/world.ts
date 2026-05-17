import { Difficulty, DefaultNPCSpecies, SectorHexTypes } from "../enums.js";

export interface IconDefinition {
  key: string;
  color?: string;
}

export interface NPC {
  name: string;
  imageFilenames?: string[];
  icon?: IconDefinition;
  sharedWithPlayers?: boolean;
  pronouns?: string;
  species?: string | null;
  lastLocationId?: string;
  lastSectorId?: string;
  characterConnections?: Record<string, boolean>;
  characterBonds?: Record<string, boolean>;
  characterBondProgress?: Record<string, number>;
  rank?: Difficulty;
  callsign?: string;
  updatedDate: Date;
  createdDate: Date;
}

export interface GMNPC {
  goal?: string;
  role?: string;
  descriptor?: string;
  disposition?: string;
  activity?: string;
  firstLook?: string;
  revealedAspect?: string;
  gmNotes?: Uint8Array;
}

export interface Location {
  name: string;
  parentLocationId?: string | null;
  imageFilenames?: string[];
  icon?: IconDefinition;
  sharedWithPlayers?: boolean;
  characterBonds?: Record<string, boolean>;
  type?: string;
  fields?: Record<string, string>;
  mapBackgroundImageFilename?: string;
  showMap?: boolean;
  updatedDate: Date;
  createdDate: Date;
}

export interface GMLocation {
  fields?: Record<string, string>;
  gmNotes?: Uint8Array;
  descriptor?: string;
  trouble?: string;
  locationFeatures?: string;
}

export interface SectorMapEntry {
  type: SectorHexTypes;
  locationId?: string;
}

export interface SectorMap {
  [row: number]: {
    [col: number]: SectorMapEntry;
  };
}

export interface Sector {
  name: string;
  sharedWithPlayers: boolean;
  region?: string;
  trouble?: string;
  map: SectorMap;
  createdDate: Date;
}

export interface Lore {
  name: string;
  imageFilenames?: string[];
  icon?: IconDefinition;
  sharedWithPlayers?: boolean;
  tags?: string[];
  updatedDate: Date;
  createdDate: Date;
}

export interface GMLore {
  gmNotes?: Uint8Array;
}
