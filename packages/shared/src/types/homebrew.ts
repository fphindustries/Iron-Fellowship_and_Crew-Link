import { HomebrewContentType } from "../enums.js";

export interface HomebrewCollection {
  id: string;
  name: string;
  creator: string;
  editors: string[];
  viewers: string[];
  description?: string;
}

export interface HomebrewContent {
  id: string;
  collectionId: string;
  contentType: HomebrewContentType;
  data: Record<string, unknown>;
}

export interface HomebrewInviteKey {
  id: string;
  collectionId: string;
  key: string;
  expiresAt: Date;
}
