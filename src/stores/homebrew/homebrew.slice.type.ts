import { Datasworn } from "@datasworn/core";
import { HomebrewAssetDocument } from "types/homebrew/HomebrewAssets.type";
import { HomebrewAssetCollectionDocument } from "types/homebrew/HomebrewAssetCollection.type";
import {
  ExpansionDocument,
  HomebrewCollectionDocument,
} from "types/homebrew/HomebrewCollection.type";
import { HomebrewMoveDocument } from "types/homebrew/HomebrewMove.type";
import { HomebrewMoveCategoryDocument } from "types/homebrew/HomebrewMoveCategory.type";
import { HomebrewOracleTableDocument } from "types/homebrew/HomebrewOracleTable.type";
import { HomebrewOracleCollectionDocument } from "types/homebrew/HomebrewOracleCollection.type";
import { HomebrewStatDocument } from "types/homebrew/HomebrewStat.type";
import { HomebrewNonLinearMeterDocument } from "types/homebrew/HomebrewNonLinearMeter.type";
import { HomebrewImpact } from "types/homebrew/HomebrewImpacts.type";
import { HomebrewLegacyTrackDocument } from "types/homebrew/HomebrewLegacyTrack.type";
import { HomebrewImpactCategoryDocument } from "types/homebrew/HomebrewImpacts.type";
import { HomebrewConditionMeterDocument } from "types/homebrew/HomebrewConditionMeters.type";

export interface HomebrewData<T> {
  data?: Record<string, T>;
  loaded: boolean;
  error?: string;
}

export interface HomebrewEntry {
  base: HomebrewCollectionDocument;

  stats?: HomebrewData<HomebrewStatDocument>;
  conditionMeters?: HomebrewData<HomebrewConditionMeterDocument>;
  nonLinearMeters?: HomebrewData<HomebrewNonLinearMeterDocument>;
  impactCategories?: HomebrewData<HomebrewImpactCategoryDocument>;
  legacyTracks?: HomebrewData<HomebrewLegacyTrackDocument>;

  oracleCollections?: HomebrewData<HomebrewOracleCollectionDocument>;
  oracleTables?: HomebrewData<HomebrewOracleTableDocument>;
  dataswornOracles?: Record<string, Datasworn.OracleTablesCollection>;

  moveCategories?: HomebrewData<HomebrewMoveCategoryDocument>;
  moves?: HomebrewData<HomebrewMoveDocument>;
  dataswornMoves?: Record<string, Datasworn.MoveCategory>;

  assetCollections?: HomebrewData<HomebrewAssetCollectionDocument>;
  assets?: HomebrewData<HomebrewAssetDocument>;
  dataswornAssets?: Record<string, Datasworn.AssetCollection>;
}

export interface HomebrewSliceData {
  sortedHomebrewCollectionIds: string[];
  collections: Record<string, HomebrewEntry>;
  loading: boolean;
  error?: string;
}

export interface HomebrewSliceActions {
  subscribe: (uid: string) => () => void;
  subscribeToHomebrewContent: (homebrewIds: string[]) => () => void;

  createExpansion: (expansion: ExpansionDocument) => Promise<string>;
  updateExpansion: (
    expansionId: string,
    expansion: Partial<HomebrewCollectionDocument>
  ) => Promise<void>;
  deleteExpansion: (expansionId: string) => Promise<void>;

  createStat: (stat: HomebrewStatDocument) => Promise<void>;
  updateStat: (statId: string, stat: HomebrewStatDocument) => Promise<void>;
  deleteStat: (statId: string) => Promise<void>;

  createConditionMeter: (
    conditionMeter: HomebrewConditionMeterDocument
  ) => Promise<void>;
  updateConditionMeter: (
    conditionMeterId: string,
    conditionMeter: HomebrewConditionMeterDocument
  ) => Promise<void>;
  deleteConditionMeter: (conditionMeterId: string) => Promise<void>;

  createNonLinearMeter: (
    meter: HomebrewNonLinearMeterDocument
  ) => Promise<void>;
  updateNonLinearMeter: (
    meterId: string,
    meter: HomebrewNonLinearMeterDocument
  ) => Promise<void>;
  deleteNonLinearMeter: (meterId: string) => Promise<void>;

  createImpactCategory: (
    category: HomebrewImpactCategoryDocument
  ) => Promise<void>;
  updateImpactCategory: (
    impactCategoryId: string,
    impactCategory: HomebrewImpactCategoryDocument
  ) => Promise<void>;
  deleteImpactCategory: (impactCategoryId: string) => Promise<void>;
  updateImpact: (
    impactCategoryId: string,
    impact: HomebrewImpact
  ) => Promise<void>;
  deleteImpact: (impactCategoryId: string, impactId: string) => Promise<void>;

  createLegacyTrack: (
    legacyTrack: HomebrewLegacyTrackDocument
  ) => Promise<void>;
  updateLegacyTrack: (
    legacyTrackId: string,
    legacyTrack: HomebrewLegacyTrackDocument
  ) => Promise<void>;
  deleteLegacyTrack: (legacyTrackId: string) => Promise<void>;

  createOracleCollection: (
    oracleCollection: HomebrewOracleCollectionDocument
  ) => Promise<void>;
  updateOracleCollection: (
    oracleCollectionId: string,
    oracleCollection: Partial<HomebrewOracleCollectionDocument>
  ) => Promise<void>;
  deleteOracleCollection: (
    homebrewId: string,
    oracleCollectionId: string
  ) => Promise<void>;

  createOracleTable: (
    oracleTable: HomebrewOracleTableDocument
  ) => Promise<void>;
  updateOracleTable: (
    oracleTableId: string,
    oracleTable: Partial<HomebrewOracleTableDocument>
  ) => Promise<void>;
  deleteOracleTable: (oracleTableId: string) => Promise<void>;

  updateDataswornOracles: (homebrewId: string) => void;

  createMoveCategory: (
    moveCategory: HomebrewMoveCategoryDocument
  ) => Promise<void>;
  updateMoveCategory: (
    moveCategoryId: string,
    moveCategory: HomebrewMoveCategoryDocument
  ) => Promise<void>;
  deleteMoveCategory: (
    homebrewId: string,
    moveCategoryId: string
  ) => Promise<void>;

  createMove: (move: HomebrewMoveDocument) => Promise<void>;
  updateMove: (
    moveId: string,
    move: Partial<HomebrewMoveDocument>
  ) => Promise<void>;
  deleteMove: (moveId: string) => Promise<void>;

  updateDataswornMoves: (homebrewId: string) => void;

  createAssetCollection: (
    assetCollection: HomebrewAssetCollectionDocument
  ) => Promise<void>;
  updateAssetCollection: (
    assetCollectionId: string,
    assetCollection: HomebrewAssetCollectionDocument
  ) => Promise<void>;
  deleteAssetCollection: (
    homebrewId: string,
    assetCollectionId: string
  ) => Promise<void>;

  createAsset: (asset: HomebrewAssetDocument) => Promise<void>;
  updateAsset: (
    assetId: string,
    asset: Partial<HomebrewAssetDocument>
  ) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;

  updateDataswornAssets: (homebrewId: string) => void;
}

export type HomebrewSlice = HomebrewSliceData & HomebrewSliceActions;
