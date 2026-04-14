import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_ORACLE_COLLECTIONS_TABLE } from "./_getRef";

export const listenToHomebrewOracleCollections = createHomebrewListenerFunction(
  HOMEBREW_ORACLE_COLLECTIONS_TABLE
);
