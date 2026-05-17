import { Truth, World } from "api-calls/world/_world.type";
import { WorldAiSettings } from "api-calls/world/settings/_worldSettings.type";
import { LocationsSlice } from "./locations/locations.slice.type";
import { NPCsSlice } from "./npcs/npcs.slice.type";
import { LoreSlice } from "./lore/lore.slice.type";
import { SectorSlice } from "./sector/sector.slice.type";
export interface CurrentWorldSliceData {
  currentWorldId?: string;
  currentWorld?: World;

  doAnyDocsHaveImages: boolean;
  currentWorldLocations: LocationsSlice;
  currentWorldNPCs: NPCsSlice;
  currentWorldLore: LoreSlice;

  worldAiSettings?: WorldAiSettings;
  worldAiSettingsLoading: boolean;
}

export interface CurrentWorldSliceActions {
  setCurrentWorldId: (worldId?: string) => void;
  updateCurrentWorld: (partialWorld: Partial<World>) => Promise<void>;
  updateCurrentWorldDescription: (
    worldId: string,
    description: Uint8Array,
    isBeaconRequest?: boolean
  ) => Promise<void>;
  updateCurrentWorldTruth: (truthKey: string, truth: Truth) => Promise<void>;

  subscribeToWorldAiSettings: (worldId: string) => () => void;
  updateWorldAiSettings: (settings: Partial<WorldAiSettings>) => Promise<void>;

  resetStore: () => void;
}

export type CurrentWorldSlice = CurrentWorldSliceData &
  CurrentWorldSliceActions & {
    currentWorldSectors: SectorSlice;
  };
