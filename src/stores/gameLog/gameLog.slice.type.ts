import { Roll } from "types/DieRolls.type";

export interface GameLogSliceData {}

export interface GameLogSliceActions {
  addRoll: (params: {
    campaignId?: string;
    characterId?: string;
    roll: Roll;
  }) => Promise<string>;
  updateRoll: (id: string, roll: Roll) => Promise<void>;
  removeRoll: (id: string) => Promise<void>;

  resetStore: () => void;
}

export type GameLogSlice = GameLogSliceData & GameLogSliceActions;
