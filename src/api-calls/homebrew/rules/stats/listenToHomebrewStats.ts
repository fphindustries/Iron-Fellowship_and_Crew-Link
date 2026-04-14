import { createHomebrewListenerFunction } from "api-calls/homebrew/homebrewListenerFunction";
import { HOMEBREW_STATS_TABLE } from "./_getRef";

export const listenToHomebrewStats = createHomebrewListenerFunction(
  HOMEBREW_STATS_TABLE
);
