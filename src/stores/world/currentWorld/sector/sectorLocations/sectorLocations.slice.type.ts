import { SectorLocationDocument } from "types/SectorLocations.type";

export interface SectorLocationsSliceData {
  locations: { [locationId: string]: SectorLocationDocument };
  openLocationNotes?: Uint8Array;
  openLocationGMNotes?: Uint8Array;

  openLocationId?: string;
}

export interface SectorLocationsSliceActions {
  setOpenLocationId: (locationId: string | undefined) => void;

  subscribe: (worldId: string, sectorId: string) => () => void;
  subscribeToLocationNotes: (
    locationId: string,
    isPrivate?: boolean
  ) => () => void;

  createLocation: (location: SectorLocationDocument) => Promise<string>;
  updateLocation: (
    locationId: string,
    location: Partial<SectorLocationDocument>
  ) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
  updateLocationNotes: (
    locationId: string,
    notes: Uint8Array,
    isPrivate?: boolean,
    isBeaconRequest?: boolean
  ) => Promise<void>;

  resetStoreNotes: () => void;
  resetStore: () => void;
}

export type SectorLocationsSlice = SectorLocationsSliceData &
  SectorLocationsSliceActions;
