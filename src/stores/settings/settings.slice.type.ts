import { StoredMove } from "types/Moves.type";
import { StoredOracle } from "types/CustomOracles.type";

export interface SettingsSliceData {}

export interface SettingsSliceActions {
  addCustomMove: (move: StoredMove) => Promise<void>;
  updateCustomMove: (moveId: string, move: StoredMove) => Promise<void>;
  removeCustomMove: (moveId: string) => Promise<void>;

  addCustomOracle: (oracle: StoredOracle) => Promise<void>;
  updateCustomOracle: (oracleId: string, oracle: StoredOracle) => Promise<void>;
  removeCustomOracle: (oracleId: string) => Promise<void>;
}

export type SettingsSlice = SettingsSliceData & SettingsSliceActions;
