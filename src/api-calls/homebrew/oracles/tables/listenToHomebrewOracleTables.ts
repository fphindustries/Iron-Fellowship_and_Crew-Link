import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_ORACLE_TABLES_TABLE } from "./_getRef";

export const listenToHomebrewOracleTables = createHomebrewListenerFunction(
  HOMEBREW_ORACLE_TABLES_TABLE
);
