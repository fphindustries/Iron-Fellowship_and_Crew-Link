import { MoveStatKeys } from "../enums.js";

export interface StoredMove {
  $id: string;
  name: string;
  stats?: MoveStatKeys[];
  text: string;
  oracleIds?: string[];
}
